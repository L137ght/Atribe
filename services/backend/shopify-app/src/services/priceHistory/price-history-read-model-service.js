import { priceHistoryObservationRepository } from "../../repositories/price-history-observation-repository.js";
import { priceHistoryPointRepository } from "../../repositories/price-history-point-repository.js";

const OWNED_DATA_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const formatCurrency = (value, currency = "INR") => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  if (currency === "INR") {
    return `₹${numericValue.toLocaleString("en-IN")}`;
  }

  return numericValue.toLocaleString("en-IN", {
    style: "currency",
    currency
  });
};

const isFresh = (observation) => {
  const observedAt = Date.parse(observation?.observedAt || "");
  return Number.isFinite(observedAt) && Date.now() - observedAt <= OWNED_DATA_MAX_AGE_MS;
};

const buildObservationChart = (observations) => {
  const seen = new Set();
  return observations
    .filter((observation) => Number(observation.currentPrice) > 0)
    .map((observation) => ({
      date: String(observation.observedAt || "").slice(0, 10),
      price: Number(observation.currentPrice)
    }))
    .filter((point) => {
      const key = `${point.date}:${point.price}`;
      if (!point.date || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .reverse();
};

export const priceHistoryReadModelService = {
  async getOwnedPriceHistory(product) {
    if (!product?.id) {
      return null;
    }

    const [observations, storedPoints] = await Promise.all([
      priceHistoryObservationRepository.findRecentByProductId(product.id, 50),
      priceHistoryPointRepository.findByProductId(product.id)
    ]);

    const latest = observations[0];
    if (!latest || !isFresh(latest)) {
      return null;
    }

    const pointChartData = storedPoints.map((point) => ({
      date: point.date,
      price: point.price
    }));
    const observationChartData = buildObservationChart(observations);
    const chartData =
      pointChartData.length >= 2
        ? pointChartData
        : observationChartData.length >= 2
          ? observationChartData
          : [];

    return {
      status: "success",
      provider: latest.source,
      data: {
        provider: latest.source,
        sourcePriority: 0,
        productPageUrl: product.providerPageUrl,
        productTitle: product.title,
        marketplace: product.marketplace,
        originalUrl: product.resolvedUrl || product.canonicalUrl,
        currentPrice: formatCurrency(latest.currentPrice, latest.currency),
        lowestPrice: formatCurrency(latest.lowestPrice, latest.currency),
        averagePrice: formatCurrency(latest.averagePrice, latest.currency),
        highestPrice: formatCurrency(latest.highestPrice, latest.currency),
        dealVerdict: "Unknown",
        recommendationText: null,
        chartData,
        confidence: latest.confidence,
        lastFetchedAt: latest.observedAt
      },
      meta: {
        cache: "owned",
        attemptedProviders: [],
        fallbackUsed: false
      }
    };
  }
};
