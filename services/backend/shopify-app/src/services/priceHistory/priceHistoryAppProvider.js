/**
 * PriceHistoryApp.com provider.
 *
 * Attempts direct slug match first, then site search.
 * Resolves direct product pages from URL-derived and marketplace page titles.
 *
 * @module priceHistoryAppProvider
 */

import { extractTokens, normalizeToSlug } from "./productInfo.js";
import { fetchHtml } from "./providers.js";
import {
  extractLinks,
  extractMetaContent,
  extractTagContent,
  extractPriceNearLabel,
  extractChartData,
  extractNextData
} from "./htmlParsers.js";
import { normalizeDealVerdict } from "./confidence.js";

const PRICE_HISTORY_APP_BASE = "https://pricehistoryapp.com";

/**
 * Lookup product on PriceHistoryApp as fallback.
 * @param {import("./productInfo.js").ProductInfo} productInfo
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<PriceHistoryResult|null>}
 */
export async function lookupPriceHistoryApp(productInfo, { signal } = {}) {
  const titleCandidates = await buildTitleCandidates(productInfo, { signal });
  let pageHtml = null;
  let productPageUrl = null;

  // Attempt 1: Direct slug from URL/page title candidates.
  for (const title of titleCandidates) {
    const slug = normalizeToSlug(title);
    if (!slug) continue;

    const directResult = await fetchAndVerifyDirectProductPage(directUrlForSlug(slug), title, {
      signal
    });

    if (directResult) {
      pageHtml = directResult.pageHtml;
      productPageUrl = directResult.productPageUrl;
      break;
    }
  }

  // Attempt 2: Search fallback
  if (!productPageUrl) {
    for (const title of titleCandidates) {
      try {
        const searchHtml = await fetchPriceHistoryAppSearchHtml(title, { signal });
        const foundPath = findProductFromSearch(searchHtml, title);

        if (foundPath) {
          productPageUrl = `${PRICE_HISTORY_APP_BASE}${foundPath}`;
          pageHtml = await fetchHtml(productPageUrl, { signal });
          break;
        }
      } catch (error) {
        if (error.name === "AbortError") throw error;
      }
    }
  }

  if (!productPageUrl || !pageHtml) return null;

  return parsePriceHistoryAppProductPage(pageHtml, productPageUrl, productInfo);
}

async function buildTitleCandidates(productInfo, { signal } = {}) {
  const titles = [productInfo.titleCandidate, productInfo.productId].filter(Boolean);
  const marketplaceTitle = await fetchMarketplaceProductTitle(productInfo.originalUrl, { signal });
  if (marketplaceTitle) {
    titles.unshift(marketplaceTitle);
  }

  return [...new Set(titles.map((title) => String(title || "").trim()).filter(Boolean))];
}

async function fetchMarketplaceProductTitle(url, { signal } = {}) {
  try {
    const html = await fetchHtml(url, { signal, timeoutMs: 6000 });
    const amazonTitle = html
      .match(/id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]
      ?.replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return (
      amazonTitle ||
      extractMetaContent(html, "og:title") ||
      extractTagContent(html, "title")?.replace(/\s*:\s*Amazon\.in.*$/i, "").trim() ||
      null
    );
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return null;
  }
}

function directUrlForSlug(slug) {
  return `${PRICE_HISTORY_APP_BASE}/product/${slug}`;
}

async function fetchAndVerifyDirectProductPage(directUrl, sourceTitle, { signal } = {}) {
  try {
    const pageHtml = await fetchHtml(directUrl, { signal });
    const pageTitle =
      extractTagContent(pageHtml, "title") ||
      extractMetaContent(pageHtml, "og:title") ||
      "";

    if (/404\s+Page\s+Not\s+Found/i.test(pageTitle)) {
      return null;
    }

    const pageTokens = extractTokens(pageTitle);
    const sourceTokens = extractTokens(sourceTitle || "");
    const overlap = sourceTokens.filter((t) => pageTokens.includes(t)).length;

    if (overlap >= 2 || (pageTokens.length > 0 && overlap >= 1 && sourceTokens.length <= 3)) {
      return { pageHtml, productPageUrl: directUrl };
    }
  } catch (error) {
    if (error.name === "AbortError") throw error;
  }

  return null;
}

/**
 * Fetch PriceHistoryApp search results HTML.
 * @param {string} query
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<string>}
 */
async function fetchPriceHistoryAppSearchHtml(query, { signal } = {}) {
  const encoded = encodeURIComponent(query);
  return fetchHtml(`${PRICE_HISTORY_APP_BASE}/search?q=${encoded}`, { signal });
}

/**
 * Find the best matching product link from search results.
 * @param {string} html
 * @param {string} targetTitle
 * @returns {string|null} relative path like "/product/..."
 */
function findProductFromSearch(html, targetTitle) {
  const targetTokens = extractTokens(targetTitle);
  if (!targetTokens.length) return null;

  const allLinks = extractLinks(html, PRICE_HISTORY_APP_BASE);
  const candidates = allLinks
    .filter((link) => link.url.includes("/product/"))
    .map((link) => {
      const textTokens = extractTokens(link.text);
      const slug = normalizeToSlug(link.text);
      const slugTokens = slug.split("-").filter(Boolean);
      const allTokens = [...new Set([...textTokens, ...slugTokens])];
      const overlap = targetTokens.filter((t) => allTokens.includes(t)).length;
      return { ...link, score: overlap };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return null;

  // Extract relative path
  try {
    const url = new URL(candidates[0].url);
    return url.pathname + url.search;
  } catch {
    return candidates[0].href;
  }
}

/**
 * Parse PriceHistoryApp product page.
 * @param {string} html
 * @param {string} productPageUrl
 * @param {import("./productInfo.js").ProductInfo} productInfo
 * @returns {PriceHistoryResult|null}
 */
export function parsePriceHistoryAppProductPage(html, productPageUrl, productInfo) {
  try {
    const nextProduct = extractPriceHistoryAppNextProduct(html);

    const productTitle =
      nextProduct?.name ||
      extractMetaContent(html, "og:title") ||
      extractTagContent(html, "h1") ||
      extractTagContent(html, "title")?.replace(/[-|].*PriceHistory.*$/i, "").trim() ||
      null;

    const currentPrice =
      productInfoValue(nextProduct?.price) ||
      extractPriceNearLabel(html, "Current(?:\\s+Price)?") ||
      null;
    const lowestPrice =
      productInfoValue(nextProduct?.lowest_price) ||
      extractPriceNearLabel(html, "Lowest") ||
      extractPriceNearLabel(html, "Min") ||
      null;
    const highestPrice =
      productInfoValue(nextProduct?.highest_price) ||
      extractPriceNearLabel(html, "Highest") ||
      extractPriceNearLabel(html, "Max") ||
      null;
    const averagePrice =
      productInfoValue(nextProduct?.average_price) ||
      extractPriceNearLabel(html, "Average") ||
      extractPriceNearLabel(html, "Avg") ||
      null;

    let dealVerdict = "Unknown";
    const verdictPatterns = [
      /Good deal/i, /Not a good deal/i, /Average deal/i,
      /Price is high/i, /Great deal/i, /Best price/i, /Fair price/i
    ];
    for (const pattern of verdictPatterns) {
      const match = html.match(pattern);
      if (match) {
        dealVerdict = normalizeDealVerdict(match[0]);
        break;
      }
    }

    const chartData = nextProduct
      ? extractHistoryChartData(nextProduct.history) || []
      : extractChartData(html);

    return {
      provider: "pricehistoryapp",
      sourcePriority: 2,
      productPageUrl,
      productTitle,
      marketplace: productInfo.marketplace,
      originalUrl: productInfo.originalUrl,
      currentPrice: currentPrice ? `₹${currentPrice.toLocaleString("en-IN")}` : null,
      lowestPrice: lowestPrice ? `₹${lowestPrice.toLocaleString("en-IN")}` : null,
      averagePrice: averagePrice ? `₹${averagePrice.toLocaleString("en-IN")}` : null,
      highestPrice: highestPrice ? `₹${highestPrice.toLocaleString("en-IN")}` : null,
      dealVerdict,
      recommendationText: null,
      chartData,
      confidence: 0.55,
      lastFetchedAt: new Date().toISOString()
    };
  } catch {
    return null;
  }
}

function extractPriceHistoryAppNextProduct(html) {
  const nextData = extractNextData(html);
  return nextData?.props?.pageProps?.ogProduct || null;
}

function productInfoValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractHistoryChartData(history) {
  if (!history || typeof history !== "object") {
    return null;
  }

  const points = Object.entries(history)
    .map(([timestamp, price]) => {
      const unixSeconds = Number(timestamp);
      const parsedPrice = Number(price);
      if (!Number.isFinite(unixSeconds) || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        return null;
      }

      return {
        date: new Date(unixSeconds * 1000).toISOString().slice(0, 10),
        price: parsedPrice
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  return points.length >= 2 ? points : null;
}
