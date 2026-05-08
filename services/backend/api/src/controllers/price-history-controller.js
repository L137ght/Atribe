import { getBestPriceHistoryForProductUrl } from "../../../shopify-app/src/services/priceHistory/index.js";
import { logger } from "../../../shopify-app/src/utils/logger.js";

export const priceHistoryController = {
  async lookup(req, res) {
    const url = String(req.query.url || "").trim();

    if (!url) {
      return res.status(400).json({
        status: "error",
        provider: null,
        data: null,
        error: {
          code: "INVALID_URL",
          message: "A valid product URL is required."
        }
      });
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 15000);

    req.on("close", () => {
      clearTimeout(timeout);
      abortController.abort();
    });

    try {
      const startTime = Date.now();
      const result = await getBestPriceHistoryForProductUrl(url, {
        signal: abortController.signal
      });

      clearTimeout(timeout);

      const elapsedMs = Date.now() - startTime;

      if (result.status === "success") {
        logger.info("Price history lookup success", {
          url,
          provider: result.provider,
          productTitle: result.data?.productTitle || null,
          confidence: result.data?.confidence || null,
          hasChartData: (result.data?.chartData || []).length > 0,
          attemptedProviders: result.meta?.attemptedProviders || [],
          fallbackUsed: result.meta?.fallbackUsed || false,
          cache: result.meta?.cache || "miss",
          elapsedMs
        });
      } else {
        logger.warn("Price history lookup failed", {
          url,
          status: result.status,
          errorCode: result.error?.code || null,
          attemptedProviders: result.meta?.attemptedProviders || [],
          elapsedMs
        });
      }

      return res.status(200).json(result);
    } catch (error) {
      clearTimeout(timeout);

      if (error.name === "AbortError") {
        return res.status(200).json({
          status: "error",
          provider: null,
          data: null,
          error: {
            code: "PRICE_HISTORY_TIMEOUT",
            message: "Price history lookup timed out."
          },
          meta: {
            cache: "miss",
            attemptedProviders: [],
            fallbackUsed: false
          }
        });
      }

      logger.error("Price history lookup crashed", { url, error: error.message });
      return res.status(200).json({
        status: "error",
        provider: null,
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred."
        },
        meta: {
          cache: "miss",
          attemptedProviders: [],
          fallbackUsed: false
        }
      });
    }
  }
};
