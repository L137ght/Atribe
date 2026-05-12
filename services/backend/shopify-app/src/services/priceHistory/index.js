/**
 * Main price history orchestrator.
 *
 * Resolves price history for Amazon/Flipkart product URLs by:
 *   1. PriceHistoryApp.com (primary — direct slug, page-title fallback, search)
 *   2. ProductHistory.in (fallback — search-based, no suffix guessing)
 *
 * Includes caching to avoid redundant fetches.
 *
 * @module priceHistory
 */

import { extractProductInfoFromUrl } from "./productInfo.js";
import { lookupProductHistory } from "./productHistoryProvider.js";
import { lookupPriceHistoryApp } from "./priceHistoryAppProvider.js";
import { getCached, setCached } from "./cache.js";
import { createTimeoutSignal, resolveRedirectUrl } from "./providers.js";
import { priceHistoryPersistenceService } from "./price-history-persistence-service.js";
import { priceHistoryReadModelService } from "./price-history-read-model-service.js";

/**
 * Get the best available price history for a product URL.
 * Tries PriceHistoryApp first, then falls back to ProductHistory.
 *
 * @param {string} productUrl - Amazon or Flipkart product URL
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal] - external abort signal
 * @returns {Promise<Object>} normalized response shape
 */
export async function getBestPriceHistoryForProductUrl(productUrl, { signal } = {}) {
  const startedAt = Date.now();
  const requestedUrl = String(productUrl || "").trim();
  const attemptedProviders = [];
  let fallbackUsed = false;

  const normalizedUrl = await normalizeProductUrl(productUrl, { signal });
  const productInfo = extractProductInfoFromUrl(normalizedUrl);

  if (!productInfo.isValid || !productInfo.marketplace) {
    const response = {
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
    await safeRecordLookupEvent({
      requestedUrl,
      normalizedUrl,
      product: null,
      result: response,
      startedAt
    });
    return response;
  }

  const product = await safeUpsertProductFromInfo({ productInfo, normalizedUrl });
  const ownedResult = await safeGetOwnedPriceHistory(product);
  if (ownedResult) {
    await safeRecordLookupEvent({
      requestedUrl,
      normalizedUrl,
      product,
      result: ownedResult,
      startedAt,
      cacheStatus: "owned"
    });
    return ownedResult;
  }

  // Check cache
  const cached = getCached(productInfo.cacheKey);
  if (cached) {
    const response = {
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
    await safePersistSuccessfulLookup({ product, result: response });
    await safeRecordLookupEvent({
      requestedUrl,
      normalizedUrl,
      product,
      result: response,
      startedAt,
      cacheStatus: "hit"
    });
    return response;
  }

  // Provider total timeout
  const timeout = createTimeoutSignal(12000);

  // Link external signal
  if (signal) {
    signal.addEventListener("abort", () => timeout.signal.dispatchEvent(new Event("abort")), { once: true });
  }

  try {
    // --- PRIMARY: PriceHistoryApp ---
    attemptedProviders.push("pricehistoryapp");

    let result = null;
    try {
      result = await lookupPriceHistoryApp(productInfo, { signal: timeout.signal });
    } catch (error) {
      if (error.name === "AbortError") {
        timeout.clear();
        const response = buildTimeoutResponse(attemptedProviders);
        await safeRecordLookupEvent({
          requestedUrl,
          normalizedUrl,
          product,
          result: response,
          startedAt
        });
        return response;
      }
      // Provider failed, continue to fallback
    }

    if (result) {
      timeout.clear();
      const response = {
        status: "success",
        provider: "pricehistoryapp",
        data: result,
        meta: {
          cache: "miss",
          attemptedProviders,
          fallbackUsed: false
        }
      };
      setCached(productInfo.cacheKey, "success", "pricehistoryapp", result);
      await safePersistSuccessfulLookup({ product, result: response });
      await safeRecordLookupEvent({
        requestedUrl,
        normalizedUrl,
        product,
        result: response,
        startedAt
      });
      return response;
    }

    // --- FALLBACK: ProductHistory ---
    attemptedProviders.push("producthistory");
    fallbackUsed = true;

    try {
      result = await lookupProductHistory(productInfo, { signal: timeout.signal });
    } catch (error) {
      if (error.name === "AbortError") {
        timeout.clear();
        const response = buildTimeoutResponse(attemptedProviders);
        await safeRecordLookupEvent({
          requestedUrl,
          normalizedUrl,
          product,
          result: response,
          startedAt
        });
        return response;
      }
    }

    timeout.clear();

    if (result) {
      const response = {
        status: "success",
        provider: "producthistory",
        data: result,
        meta: {
          cache: "miss",
          attemptedProviders,
          fallbackUsed: true
        }
      };
      setCached(productInfo.cacheKey, "success", "producthistory", result);
      await safePersistSuccessfulLookup({ product, result: response });
      await safeRecordLookupEvent({
        requestedUrl,
        normalizedUrl,
        product,
        result: response,
        startedAt
      });
      return response;
    }

    // Both providers failed
    setCached(productInfo.cacheKey, "empty", null, null);
    const response = {
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
    await safeRecordLookupEvent({
      requestedUrl,
      normalizedUrl,
      product,
      result: response,
      startedAt
    });
    return response;
  } catch (error) {
    timeout.clear();
    if (error.name === "AbortError") {
      const response = buildTimeoutResponse(attemptedProviders);
      await safeRecordLookupEvent({
        requestedUrl,
        normalizedUrl,
        product,
        result: response,
        startedAt
      });
      return response;
    }
    const response = {
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
    await safeRecordLookupEvent({
      requestedUrl,
      normalizedUrl,
      product,
      result: response,
      startedAt
    });
    return response;
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

async function normalizeProductUrl(productUrl, { signal } = {}) {
  const rawUrl = String(productUrl || "").trim();

  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.toLowerCase() !== "amzn.in") {
      return rawUrl;
    }

    return await resolveRedirectUrl(rawUrl, { signal });
  } catch {
    return rawUrl;
  }
}

async function safeUpsertProductFromInfo(args) {
  try {
    return await priceHistoryPersistenceService.upsertProductFromInfo(args);
  } catch {
    return null;
  }
}

async function safeGetOwnedPriceHistory(product) {
  try {
    return await priceHistoryReadModelService.getOwnedPriceHistory(product);
  } catch {
    return null;
  }
}

async function safePersistSuccessfulLookup(args) {
  try {
    await priceHistoryPersistenceService.persistSuccessfulLookup(args);
  } catch {
    // Price-history persistence is diagnostic and ownership-building, not user-facing availability.
  }
}

async function safeRecordLookupEvent({ requestedUrl, normalizedUrl, product, result, startedAt, cacheStatus }) {
  try {
    await priceHistoryPersistenceService.recordLookupEvent({
      requestedUrl,
      normalizedUrl,
      product,
      result,
      elapsedMs: Date.now() - startedAt,
      cacheStatus
    });
  } catch {
    // Lookup diagnostics should never break lookup compatibility.
  }
}
