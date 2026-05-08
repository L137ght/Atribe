import { atribeBackendUrl, isAtribeBackendConfigured } from "./backend";

const SUPPORTED_MARKETPLACES = ["amazon.in", "amazon.com", "flipkart.com"];

/**
 * Check if a URL is from a supported marketplace for price history lookup.
 * @param {string} url
 * @returns {boolean}
 */
export function isPriceHistorySupportedDomain(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return SUPPORTED_MARKETPLACES.some(
      (marketplace) =>
        hostname === marketplace || hostname.endsWith(`.${marketplace}`)
    );
  } catch {
    return false;
  }
}

/**
 * Fetch price history from backend.
 * Backend tries ProductHistory.in first, then PriceHistoryApp.com as fallback.
 *
 * @param {string} url - Amazon or Flipkart product URL
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{
 *   status: "success" | "empty" | "unsupported" | "error",
 *   provider: string | null,
 *   data: Object | null,
 *   error?: { code: string, message: string },
 *   meta?: { cache: string, attemptedProviders: string[], fallbackUsed: boolean }
 * }>}
 */
export async function fetchPriceHistory(url, { signal } = {}) {
  if (!isAtribeBackendConfigured) {
    return { status: "unsupported", provider: null, data: null };
  }

  if (!isPriceHistorySupportedDomain(url)) {
    return { status: "unsupported", provider: null, data: null };
  }

  try {
    const apiUrl = `${atribeBackendUrl}/api/price-history/lookup?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl, {
      signal,
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return { status: "error", provider: null, data: null };
    }

    return response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      return { status: "error", provider: null, data: null };
    }
    return { status: "error", provider: null, data: null };
  }
}
