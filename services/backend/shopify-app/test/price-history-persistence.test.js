import test from "node:test";
import assert from "node:assert/strict";

process.env.DB_PROVIDER = "sqlite";
process.env.SQLITE_DB_PATH = `/private/tmp/atribe-price-history-test-${process.pid}.db`;

const { db } = await import("../src/db/database.js");
const { priceHistoryProductRepository } = await import("../src/repositories/price-history-product-repository.js");
const { priceHistoryObservationRepository } = await import("../src/repositories/price-history-observation-repository.js");
const { priceHistoryPointRepository } = await import("../src/repositories/price-history-point-repository.js");
const { priceHistoryLookupEventRepository } = await import("../src/repositories/price-history-lookup-event-repository.js");
const { priceHistoryPersistenceService } = await import("../src/services/priceHistory/price-history-persistence-service.js");
const { priceHistoryReadModelService } = await import("../src/services/priceHistory/price-history-read-model-service.js");
const { extractProductInfoFromUrl } = await import("../src/services/priceHistory/productInfo.js");

test("sqlite price history ownership tables exist", () => {
  const tables = [
    "price_history_products",
    "price_history_observations",
    "price_history_points",
    "price_history_lookup_events"
  ];

  for (const tableName of tables) {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
    assert.equal(row.name, tableName);
  }
});

test("sqlite repositories can persist products, observations, points, and events", async () => {
  const product = await priceHistoryProductRepository.upsert({
    marketplace: "amazon",
    productId: "B000000001",
    canonicalUrl: "https://www.amazon.in/dp/B000000001",
    resolvedUrl: "https://www.amazon.in/dp/B000000001",
    title: "Repository Test Product",
    imageUrl: "https://example.com/product.jpg",
    providerPageUrl: "https://pricehistoryapp.com/product/repository-test-product"
  });

  await priceHistoryObservationRepository.create({
    productId: product.id,
    source: "pricehistoryapp",
    observedAt: new Date().toISOString(),
    currentPrice: 699,
    lowestPrice: 450,
    averagePrice: 589,
    highestPrice: 799,
    confidence: 0.8,
    rawPayload: { provider: "pricehistoryapp", currentPrice: "₹699" }
  });

  const insertedPointCount = await priceHistoryPointRepository.upsertMany({
    productId: product.id,
    source: "pricehistoryapp",
    points: [
      { date: "2026-05-10", price: 799 },
      { date: "2026-05-11", price: 699 }
    ]
  });

  await priceHistoryLookupEventRepository.create({
    requestedUrl: "https://amzn.in/d/01dHCwYf",
    normalizedUrl: "https://www.amazon.in/dp/B000000001",
    productId: product.id,
    status: "success",
    provider: "pricehistoryapp",
    attemptedProviders: ["pricehistoryapp"],
    elapsedMs: 42,
    cacheStatus: "miss"
  });

  const observations = await priceHistoryObservationRepository.findRecentByProductId(product.id);
  const points = await priceHistoryPointRepository.findByProductId(product.id);
  const event = db.prepare("SELECT * FROM price_history_lookup_events WHERE product_id = ?").get(product.id);

  assert.equal(product.marketplace, "amazon");
  assert.equal(observations.length, 1);
  assert.equal(observations[0].rawPayload.currentPrice, "₹699");
  assert.equal(insertedPointCount, 2);
  assert.equal(points.length, 2);
  assert.equal(event.status, "success");
});

test("persistence service stores provider stats and real chart points", async () => {
  const productInfo = extractProductInfoFromUrl("https://www.amazon.in/dp/B000000002");
  const product = await priceHistoryPersistenceService.upsertProductFromInfo({
    productInfo,
    normalizedUrl: "https://www.amazon.in/dp/B000000002"
  });

  await priceHistoryPersistenceService.persistSuccessfulLookup({
    product,
    result: {
      status: "success",
      provider: "pricehistoryapp",
      data: {
        provider: "pricehistoryapp",
        productTitle: "Persisted Test Product",
        productPageUrl: "https://pricehistoryapp.com/product/persisted-test-product",
        marketplace: "amazon",
        originalUrl: "https://www.amazon.in/dp/B000000002",
        currentPrice: "₹699",
        lowestPrice: "₹450",
        averagePrice: "₹589",
        highestPrice: "₹799",
        chartData: [
          { date: "2026-05-10", price: 799 },
          { date: "2026-05-11", price: 699 }
        ],
        confidence: 0.9
      }
    }
  });

  const observations = await priceHistoryObservationRepository.findRecentByProductId(product.id);
  const points = await priceHistoryPointRepository.findByProductId(product.id);

  assert.equal(observations.length, 1);
  assert.equal(observations[0].currentPrice, 699);
  assert.equal(observations[0].lowestPrice, 450);
  assert.equal(points.length, 2);
  assert.deepEqual(points.map((point) => point.price), [799, 699]);
});

test("owned read model returns graph data from stored provider points", async () => {
  const product = await priceHistoryProductRepository.upsert({
    marketplace: "amazon",
    productId: "B000000003",
    canonicalUrl: "https://www.amazon.in/dp/B000000003",
    resolvedUrl: "https://www.amazon.in/dp/B000000003",
    title: "Read Model Point Product",
    providerPageUrl: "https://pricehistoryapp.com/product/read-model-point-product"
  });

  await priceHistoryObservationRepository.create({
    productId: product.id,
    source: "pricehistoryapp",
    observedAt: new Date().toISOString(),
    currentPrice: 699,
    lowestPrice: 450,
    averagePrice: 589,
    highestPrice: 799,
    confidence: 0.9
  });
  await priceHistoryPointRepository.upsertMany({
    productId: product.id,
    source: "pricehistoryapp",
    points: [
      { date: "2026-05-10", price: 799 },
      { date: "2026-05-11", price: 699 }
    ]
  });

  const ownedResult = await priceHistoryReadModelService.getOwnedPriceHistory(product);

  assert.equal(ownedResult.status, "success");
  assert.equal(ownedResult.meta.cache, "owned");
  assert.equal(ownedResult.data.currentPrice, "₹699");
  assert.deepEqual(ownedResult.data.chartData, [
    { date: "2026-05-10", price: 799 },
    { date: "2026-05-11", price: 699 }
  ]);
});

test("owned read model builds graph data from two Atribe observations when no provider points exist", async () => {
  const product = await priceHistoryProductRepository.upsert({
    marketplace: "amazon",
    productId: "B000000004",
    canonicalUrl: "https://www.amazon.in/dp/B000000004",
    resolvedUrl: "https://www.amazon.in/dp/B000000004",
    title: "Observation Graph Product"
  });

  await priceHistoryObservationRepository.create({
    productId: product.id,
    source: "atribe_direct",
    observedAt: "2026-05-11T09:00:00.000Z",
    currentPrice: 799,
    lowestPrice: 799,
    averagePrice: 799,
    highestPrice: 799
  });
  await priceHistoryObservationRepository.create({
    productId: product.id,
    source: "atribe_direct",
    observedAt: new Date().toISOString(),
    currentPrice: 699,
    lowestPrice: 699,
    averagePrice: 749,
    highestPrice: 799
  });

  const ownedResult = await priceHistoryReadModelService.getOwnedPriceHistory(product);

  assert.equal(ownedResult.status, "success");
  assert.equal(ownedResult.data.currentPrice, "₹699");
  assert.equal(ownedResult.data.chartData.length, 2);
  assert.deepEqual(ownedResult.data.chartData.map((point) => point.price), [799, 699]);
});
