/**
 * Candidate scoring for search result matching.
 * Scores how well a search result candidate matches the original product info.
 *
 * @module confidence
 */

import { extractTokens, normalizeToSlug } from "./productInfo.js";

/**
 * Score a candidate product against the original product info.
 * Higher score = better match. Normalized 0.0 to 1.0.
 *
 * @param {Object} candidate
 * @param {string} candidate.url - candidate URL
 * @param {string} candidate.title - candidate title text
 * @param {string} [candidate.visibleMarketplace] - marketplace detected in result
 * @param {Object} productInfo
 * @returns {number} score between 0 and 1
 */
export function scoreProductCandidate(candidate, productInfo) {
  let score = 0;
  const urlLower = (candidate.url || "").toLowerCase();
  const titleLower = (candidate.title || "").toLowerCase();
  const slug = normalizeToSlug(titleLower);
  const slugTokens = slug.split("-").filter(Boolean);

  // Marketplace in URL (+0.30)
  if (productInfo.marketplace && urlLower.includes(productInfo.marketplace)) {
    score += 0.30;
  }

  // Title token overlap (+0.20)
  const titleTokens = extractTokens(candidate.title || "");
  const sourceTokens = extractTokens(productInfo.titleCandidate || "");
  if (sourceTokens.length > 0 && titleTokens.length > 0) {
    const overlap = sourceTokens.filter((t) => titleTokens.includes(t)).length;
    const ratio = overlap / Math.max(sourceTokens.length, 1);
    score += Math.min(ratio * 0.20, 0.20);
  }

  // Slug token overlap (+0.20)
  if (sourceTokens.length > 0 && slugTokens.length > 0) {
    const slugOverlap = sourceTokens.filter((t) => slugTokens.includes(t)).length;
    const slugRatio = slugOverlap / Math.max(sourceTokens.length, 1);
    score += Math.min(slugRatio * 0.20, 0.20);
  }

  // Product ID in URL or title (+0.20)
  if (productInfo.productId) {
    const pidLower = productInfo.productId.toLowerCase();
    if (urlLower.includes(pidLower) || titleLower.includes(pidLower)) {
      score += 0.20;
    }
  }

  // Marketplace label match (+0.10)
  if (
    candidate.visibleMarketplace &&
    productInfo.marketplace &&
    candidate.visibleMarketplace.toLowerCase() === productInfo.marketplace.toLowerCase()
  ) {
    score += 0.10;
  }

  // Penalty for clear marketplace mismatch (-0.40)
  if (
    candidate.visibleMarketplace &&
    productInfo.marketplace &&
    candidate.visibleMarketplace.toLowerCase() !== productInfo.marketplace.toLowerCase()
  ) {
    score -= 0.40;
  }

  return Math.max(0, Math.min(score, 1));
}

/**
 * Normalize a verdict string from any provider into a standard value.
 * @param {string|null} verdict
 * @returns {string}
 */
export function normalizeDealVerdict(verdict) {
  if (!verdict) return "Unknown";

  const lower = verdict.toLowerCase();

  if (lower.includes("good time") || lower.includes("buy now") || lower.includes("great")) {
    return "Good time to buy";
  }
  if (lower.includes("bad time") || lower.includes("wait") || lower.includes("not a good") || lower.includes("avoid")) {
    return "Bad time to buy";
  }
  if (lower.includes("average") || lower.includes("fair") || lower.includes("ok")) {
    return "Average deal";
  }
  if (lower.includes("good deal")) return "Good time to buy";
  if (lower.includes("price is high") || lower.includes("overpriced")) return "Bad time to buy";

  return "Unknown";
}
