import { priceHistoryLookupEventRepository } from "../../repositories/price-history-lookup-event-repository.js";
import { priceHistoryObservationRepository } from "../../repositories/price-history-observation-repository.js";
import { priceHistoryPointRepository } from "../../repositories/price-history-point-repository.js";
import { priceHistoryProductRepository } from "../../repositories/price-history-product-repository.js";

const parsePriceValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const priceHistoryPersistenceService = {
  async upsertProductFromInfo({ productInfo, normalizedUrl, providerData = null }) {
    if (!productInfo?.isValid || !productInfo.marketplace) {
      return null;
    }

    return priceHistoryProductRepository.upsert({
      marketplace: productInfo.marketplace,
      productId: productInfo.productId || null,
      canonicalUrl: productInfo.productId ? normalizedUrl : normalizedUrl || productInfo.originalUrl,
      resolvedUrl: normalizedUrl || productInfo.originalUrl,
      title: providerData?.productTitle || productInfo.titleCandidate || null,
      imageUrl: providerData?.imageUrl || null,
      providerPageUrl: providerData?.productPageUrl || null
    });
  },

  async persistSuccessfulLookup({ product, result }) {
    if (!product?.id || result?.status !== "success" || !result.data) {
      return;
    }

    const source = result.provider || result.data.provider || "unknown";
    const providerData = result.data;

    await priceHistoryProductRepository.upsert({
      marketplace: product.marketplace,
      productId: product.productId || null,
      canonicalUrl: product.canonicalUrl || providerData.originalUrl || null,
      resolvedUrl: product.resolvedUrl || providerData.originalUrl || null,
      title: providerData.productTitle || product.title || null,
      imageUrl: providerData.imageUrl || product.imageUrl || null,
      providerPageUrl: providerData.productPageUrl || product.providerPageUrl || null
    });

    await priceHistoryObservationRepository.create({
      productId: product.id,
      source,
      currentPrice: parsePriceValue(providerData.currentPrice),
      lowestPrice: parsePriceValue(providerData.lowestPrice),
      averagePrice: parsePriceValue(providerData.averagePrice),
      highestPrice: parsePriceValue(providerData.highestPrice),
      currency: providerData.currency || "INR",
      confidence: providerData.confidence ?? null,
      rawPayload: providerData
    });

    await priceHistoryPointRepository.upsertMany({
      productId: product.id,
      source,
      points: providerData.chartData || [],
      currency: providerData.currency || "INR"
    });
  },

  async recordLookupEvent({
    requestedUrl,
    normalizedUrl,
    product,
    result,
    elapsedMs,
    cacheStatus
  }) {
    await priceHistoryLookupEventRepository.create({
      requestedUrl,
      normalizedUrl,
      productId: product?.id || null,
      status: result?.status || "error",
      provider: result?.provider || null,
      attemptedProviders: result?.meta?.attemptedProviders || [],
      errorCode: result?.error?.code || null,
      elapsedMs,
      cacheStatus: cacheStatus || result?.meta?.cache || null
    });
  }
};

export { parsePriceValue };
