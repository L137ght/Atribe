/**
 * Main price history orchestrator.
 *
 * Resolves price history for Amazon/Flipkart product URLs by:
 *   1. ProductHistory.in (primary — search-based, no suffix guessing)
 *   2. PriceHistoryApp.com (fallback — slug + search)
 *
 * Includes caching to avoid redundant fetches.
 *
 * @module priceHistory
 */

import { extractProductInfoFromUrl } from "./productInfo.js";
import { lookupProductHistory } from "./productHistoryProvider.js";
import { lookupPriceHistoryApp } from "./priceHistoryAppProvider.js";
import { getCached, setCached } from "./cache.js";
import { createTimeoutSignal } from "./providers.js";

/**
 * Get the best available price history for a product URL.
 * Tries ProductHistory first, falls back to PriceHistoryApp.
 *
 * @param {string} productUrl - Amazon or Flipkart product URL
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal] - external abort signal
 * @returns {Promise<Object>} normalized response shape
 */
export async function getBestPriceHistoryForProductUrl(productUrl, { signal } = {}) {
  const attemptedProviders = [];
  let fallbackUsed = false;

  // Extract product info
  const productInfo = extractProductInfoFromUrl(productUrl);

  if (!productInfo.isValid || !productInfo.marketplace) {
    return {
      status: "unsupported",
      provider: null,
      data: null,
      error: {
        code: "UNSUPPORTED_MARKETPLACE",
        message: "Only Amazon and Flipkart links are supported."
      },
      meta: {
        cache: "miss",
        attemptedProviders: [],
        fallbackUsed: false
      }
    };
  }

  // Check cache
  const cached = getCached(productInfo.cacheKey);
  if (cached) {
    return {
      status: cached.status,
      provider: cached.provider,
      data: cached.data,
      ...(cached.status === "empty" || cached.status === "error"
        ? {
            error: !cached.data ? {
              code: "PRICE_HISTORY_NOT_FOUND",
              message: "No reliable price history was found for this product."
            } : undefined
          }
        : {}),
      meta: {
        cache: "hit",
        attemptedProviders: [cached.provider].filter(Boolean),
        fallbackUsed: false
      }
    };
  }

  // Provider total timeout
  const timeout = createTimeoutSignal(12000);

  // Link external signal
  if (signal) {
    signal.addEventListener("abort", () => timeout.signal.dispatchEvent(new Event("abort")), { once: true });
  }

  try {
    // --- PRIMARY: ProductHistory ---
    attemptedProviders.push("producthistory");

    let result = null;
    try {
      result = await lookupProductHistory(productInfo, { signal: timeout.signal });
    } catch (error) {
      if (error.name === "AbortError") {
        timeout.clear();
        return buildTimeoutResponse(attemptedProviders);
      }
      // Provider failed, continue to fallback
    }

    if (result) {
      timeout.clear();
      setCached(productInfo.cacheKey, "success", "producthistory", result);
      return {
        status: "success",
        provider: "producthistory",
        data: result,
        meta: {
          cache: "miss",
          attemptedProviders,
          fallbackUsed: false
        }
      };
    }

    // --- FALLBACK: PriceHistoryApp ---
    attemptedProviders.push("pricehistoryapp");
    fallbackUsed = true;

    try {
      result = await lookupPriceHistoryApp(productInfo, { signal: timeout.signal });
    } catch (error) {
      if (error.name === "AbortError") {
        timeout.clear();
        return buildTimeoutResponse(attemptedProviders);
      }
    }

    timeout.clear();

    if (result) {
      setCached(productInfo.cacheKey, "success", "pricehistoryapp", result);
      return {
        status: "success",
        provider: "pricehistoryapp",
        data: result,
        meta: {
          cache: "miss",
          attemptedProviders,
          fallbackUsed: true
        }
      };
    }

    // Both providers failed
    setCached(productInfo.cacheKey, "empty", null, null);
    return {
      status: "empty",
      provider: null,
      data: null,
      error: {
        code: "PRICE_HISTORY_NOT_FOUND",
        message: "No reliable price history was found for this product."
      },
      meta: {
        cache: "miss",
        attemptedProviders,
        fallbackUsed: true
      }
    };
  } catch (error) {
    timeout.clear();
    if (error.name === "AbortError") {
      return buildTimeoutResponse(attemptedProviders);
    }
    return {
      status: "error",
      provider: null,
      data: null,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while looking up price history."
      },
      meta: {
        cache: "miss",
        attemptedProviders,
        fallbackUsed
      }
    };
  }
}

/**
 * Build a timeout error response.
 * @param {string[]} attemptedProviders
 * @returns {Object}
 */
function buildTimeoutResponse(attemptedProviders) {
  return {
    status: "error",
    provider: null,
    data: null,
    error: {
      code: "PRICE_HISTORY_TIMEOUT",
      message: "Price history lookup timed out. Try again later."
    },
    meta: {
      cache: "miss",
      attemptedProviders,
      fallbackUsed: attemptedProviders.length > 1
    }
  };
}
