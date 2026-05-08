/**
 * ProductHistory.in provider — primary price history source.
 *
 * Resolves product pages through search (never guesses unique suffixes).
 * Parses product pages for price stats, deal verdict, recommendation text,
 * and chart data.
 *
 * @module productHistoryProvider
 */

import { extractTokens, normalizeToSlug } from "./productInfo.js";
import { fetchHtml } from "./providers.js";
import {
  extractLinks,
  extractMetaContent,
  extractTagContent,
  extractTextBetween,
  extractScriptData,
  extractPriceNearLabel,
  extractChartData
} from "./htmlParsers.js";
import { scoreProductCandidate, normalizeDealVerdict } from "./confidence.js";

const PRODUCT_HISTORY_BASE = "https://producthistory.in";

/**
 * @typedef {Object} PriceHistoryResult
 * @property {string|null} provider
 * @property {number} sourcePriority
 * @property {string|null} productPageUrl
 * @property {string|null} productTitle
 * @property {string|null} marketplace
 * @property {string} originalUrl
 * @property {number|null} currentPrice
 * @property {number|null} lowestPrice
 * @property {number|null} averagePrice
 * @property {number|null} highestPrice
 * @property {string|null} dealVerdict
 * @property {string|null} recommendationText
 * @property {Array<{date: string, price: number}>} chartData
 * @property {number} confidence
 * @property {string} lastFetchedAt
 */

/**
 * Main entry point: search ProductHistory and parse product page.
 * @param {import("./productInfo.js").ProductInfo} productInfo
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<PriceHistoryResult|null>} null if lookup fails
 */
export async function lookupProductHistory(productInfo, { signal } = {}) {
  // Step 1: Search for product
  const candidates = await searchProductHistory(productInfo, { signal });
  if (!candidates.length) return null;

  // Step 2: Score and pick best candidate
  const scored = candidates
    .map((c) => ({
      ...c,
      score: scoreProductCandidate(c, productInfo)
    }))
    .sort((a, b) => b.score - a.score);

  // Require minimum score threshold
  if (scored[0].score < 0.15) return null;

  const best = scored[0];

  // Step 3: Fetch and parse product page
  const html = await fetchHtml(best.url, { signal });
  const parsed = parseProductHistoryProductPage(html, best.url, productInfo);

  if (!parsed) return null;

  return {
    ...parsed,
    confidence: Math.round(best.score * 100) / 100
  };
}

/**
 * Search ProductHistory for product candidates.
 * Tries multiple query strategies: original URL, product ID, marketplace + title, title alone.
 * @param {import("./productInfo.js").ProductInfo} productInfo
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Array<{url: string, title: string, visibleMarketplace: string|null}>>}
 */
export async function searchProductHistory(productInfo, { signal } = {}) {
  const queries = [
    productInfo.productId,
    productInfo.originalUrl,
    `${productInfo.marketplace} ${productInfo.titleCandidate}`,
    productInfo.titleCandidate
  ].filter(Boolean);

  const allCandidates = [];

  for (const query of queries) {
    try {
      const html = await fetchProductHistorySearchHtml(query, { signal });
      const candidates = parseProductHistorySearchResults(html, productInfo);
      allCandidates.push(...candidates);
    } catch (error) {
      if (error.name === "AbortError") throw error;
      // Continue to next query
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  return allCandidates.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

/**
 * Fetch ProductHistory search results HTML.
 * Tries multiple search URL patterns.
 * @param {string} query
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<string>}
 */
async function fetchProductHistorySearchHtml(query, { signal } = {}) {
  const encoded = encodeURIComponent(query);
  const searchUrls = [
    `${PRODUCT_HISTORY_BASE}/search?q=${encoded}`,
    `${PRODUCT_HISTORY_BASE}/search?keyword=${encoded}`,
    `${PRODUCT_HISTORY_BASE}/search?search=${encoded}`
  ];

  let lastError = null;

  for (const url of searchUrls) {
    try {
      return await fetchHtml(url, { signal });
    } catch (error) {
      if (error.name === "AbortError") throw error;
      lastError = error;
    }
  }

  throw lastError || new Error("All ProductHistory search URL patterns failed.");
}

/**
 * Parse ProductHistory search results HTML into candidate list.
 * @param {string} html
 * @param {import("./productInfo.js").ProductInfo} productInfo
 * @returns {Array<{url: string, title: string, visibleMarketplace: string|null}>}
 */
function parseProductHistorySearchResults(html, productInfo) {
  const allLinks = extractLinks(html, PRODUCT_HISTORY_BASE);

  return allLinks
    .filter((link) => link.url.includes("/product/"))
    .map((link) => ({
      url: link.url,
      title: link.text,
      visibleMarketplace: detectVisibleMarketplace(link.text, link.url)
    }));
}

/**
 * Detect which marketplace a search result appears to be for.
 * @param {string} text
 * @param {string} url
 * @returns {string|null}
 */
function detectVisibleMarketplace(text, url) {
  const combined = `${text} ${url}`.toLowerCase();
  if (combined.includes("amazon")) return "amazon";
  if (combined.includes("flipkart")) return "flipkart";
  return null;
}

/**
 * Parse a ProductHistory product page into normalized data.
 * @param {string} html
 * @param {string} productPageUrl
 * @param {import("./productInfo.js").ProductInfo} productInfo
 * @returns {PriceHistoryResult|null}
 */
function parseProductHistoryProductPage(html, productPageUrl, productInfo) {
  try {
    const productTitle =
      extractMetaContent(html, "og:title") ||
      extractTagContent(html, "h1") ||
      extractTagContent(html, "title")?.replace(/[-|].*ProductHistory.*$/i, "").trim() ||
      null;

    const currentPrice = extractPriceNearLabel(html, "Current(?:\\s+Price)?") || null;
    const lowestPrice =
      extractPriceNearLabel(html, "Lowest") ||
      extractPriceNearLabel(html, "Min") ||
      null;
    const averagePrice =
      extractPriceNearLabel(html, "Average") ||
      extractPriceNearLabel(html, "Avg") ||
      null;
    const highestPrice =
      extractPriceNearLabel(html, "Highest") ||
      extractPriceNearLabel(html, "Max") ||
      null;

    // Deal verdict and recommendation
    let dealVerdict = null;
    let recommendationText = null;

    // Try specific sections first
    const recommendationSection =
      extractTextBetween(html, /(?:Our Recommendation|Should you buy|Recommendation)[^>]*>/i, /<\/(?:div|section|p)>/i) ||
      extractTextBetween(html, /(?:verdict-panel|recommendation-box|buy-decision)[^>]*>/i, /<\/(?:div|section)>/i);

    if (recommendationSection) {
      recommendationText = recommendationSection.slice(0, 200).trim();
      dealVerdict = normalizeDealVerdict(recommendationSection);
    }

    // Fallback: look for common verdict phrases
    if (!dealVerdict || dealVerdict === "Unknown") {
      const verdictPatterns = [
        /Good time to buy/i, /Bad time to buy/i,
        /Buy now/i, /Wait for a better/i,
        /Great deal/i, /Average deal/i,
        /Good deal/i, /Not a good deal/i
      ];
      for (const pattern of verdictPatterns) {
        const match = html.match(pattern);
        if (match) {
          dealVerdict = normalizeDealVerdict(match[0]);
          break;
        }
      }
    }

    const chartData = extractChartData(html);

    return {
      provider: "producthistory",
      sourcePriority: 1,
      productPageUrl,
      productTitle,
      marketplace: productInfo.marketplace,
      originalUrl: productInfo.originalUrl,
      currentPrice: currentPrice ? `₹${currentPrice.toLocaleString("en-IN")}` : null,
      lowestPrice: lowestPrice ? `₹${lowestPrice.toLocaleString("en-IN")}` : null,
      averagePrice: averagePrice ? `₹${averagePrice.toLocaleString("en-IN")}` : null,
      highestPrice: highestPrice ? `₹${highestPrice.toLocaleString("en-IN")}` : null,
      dealVerdict: dealVerdict || "Unknown",
      recommendationText,
      chartData,
      confidence: 0,
      lastFetchedAt: new Date().toISOString()
    };
  } catch {
    return null;
  }
}
