/**
 * PriceHistoryApp.com provider — fallback price history source.
 *
 * Attempts direct slug match first, then site search.
 * Lower priority than ProductHistory.in.
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
  extractChartData
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
  // Attempt 1: Direct slug from title
  const slug = normalizeToSlug(productInfo.titleCandidate);
  let pageHtml = null;
  let productPageUrl = null;

  if (slug) {
    try {
      const directUrl = `${PRICE_HISTORY_APP_BASE}/product/${slug}`;
      pageHtml = await fetchHtml(directUrl, { signal });

      // Verify it's a real product page (not a 404 or listing page)
      const pageTitle = extractTagContent(pageHtml, "title") ||
        extractMetaContent(pageHtml, "og:title") || "";
      const pageTokens = extractTokens(pageTitle);
      const sourceTokens = extractTokens(productInfo.titleCandidate || "");
      const overlap = sourceTokens.filter((t) => pageTokens.includes(t)).length;

      if (overlap >= 2 || (pageTokens.length > 0 && overlap >= 1 && sourceTokens.length <= 3)) {
        productPageUrl = directUrl;
      } else {
        pageHtml = null;
      }
    } catch (error) {
      if (error.name === "AbortError") throw error;
      pageHtml = null;
    }
  }

  // Attempt 2: Search fallback
  if (!productPageUrl) {
    try {
      const searchHtml = await fetchPriceHistoryAppSearchHtml(
        productInfo.titleCandidate,
        { signal }
      );
      const foundPath = findProductFromSearch(searchHtml, productInfo.titleCandidate);

      if (foundPath) {
        productPageUrl = `${PRICE_HISTORY_APP_BASE}${foundPath}`;
        pageHtml = await fetchHtml(productPageUrl, { signal });
      }
    } catch (error) {
      if (error.name === "AbortError") throw error;
    }
  }

  if (!productPageUrl || !pageHtml) return null;

  return parsePriceHistoryAppProductPage(pageHtml, productPageUrl, productInfo);
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
function parsePriceHistoryAppProductPage(html, productPageUrl, productInfo) {
  try {
    const productTitle =
      extractMetaContent(html, "og:title") ||
      extractTagContent(html, "h1") ||
      extractTagContent(html, "title")?.replace(/[-|].*PriceHistory.*$/i, "").trim() ||
      null;

    const currentPrice = extractPriceNearLabel(html, "Current(?:\\s+Price)?") || null;
    const lowestPrice = extractPriceNearLabel(html, "Lowest") || extractPriceNearLabel(html, "Min") || null;
    const highestPrice = extractPriceNearLabel(html, "Highest") || extractPriceNearLabel(html, "Max") || null;
    const averagePrice = extractPriceNearLabel(html, "Average") || extractPriceNearLabel(html, "Avg") || null;

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

    const chartData = extractChartData(html);

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
