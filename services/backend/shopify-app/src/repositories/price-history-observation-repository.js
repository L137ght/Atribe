import crypto from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { fetchMany, insertRow } from "./supabase/shared.js";

const mapRow = (row) => ({
  id: row.id,
  productId: row.product_id ?? row.productId,
  source: row.source,
  observedAt: row.observed_at ?? row.observedAt,
  currentPrice: row.current_price ?? row.currentPrice ?? null,
  lowestPrice: row.lowest_price ?? row.lowestPrice ?? null,
  averagePrice: row.average_price ?? row.averagePrice ?? null,
  highestPrice: row.highest_price ?? row.highestPrice ?? null,
  currency: row.currency || "INR",
  confidence: row.confidence ?? null,
  rawPayload:
    typeof row.raw_payload === "string"
      ? JSON.parse(row.raw_payload || "{}")
      : row.raw_payload || {}
});

export const priceHistoryObservationRepository = {
  async create({
    productId,
    source,
    observedAt = new Date().toISOString(),
    currentPrice,
    lowestPrice,
    averagePrice,
    highestPrice,
    currency = "INR",
    confidence,
    rawPayload = {}
  }) {
    const id = crypto.randomUUID();

    if (env.dbProvider === "supabase") {
      await insertRow("price_history_observations", {
        id,
        product_id: productId,
        source,
        observed_at: observedAt,
        current_price: currentPrice ?? null,
        lowest_price: lowestPrice ?? null,
        average_price: averagePrice ?? null,
        highest_price: highestPrice ?? null,
        currency,
        confidence: confidence ?? null,
        raw_payload: rawPayload
      });

      return { id, productId, source, observedAt };
    }

    const statement = db.prepare(`
      INSERT INTO price_history_observations (
        id, product_id, source, observed_at, current_price, lowest_price,
        average_price, highest_price, currency, confidence, raw_payload
      )
      VALUES (
        @id, @productId, @source, @observedAt, @currentPrice, @lowestPrice,
        @averagePrice, @highestPrice, @currency, @confidence, @rawPayload
      )
    `);

    statement.run({
      id,
      productId,
      source,
      observedAt,
      currentPrice: currentPrice ?? null,
      lowestPrice: lowestPrice ?? null,
      averagePrice: averagePrice ?? null,
      highestPrice: highestPrice ?? null,
      currency,
      confidence: confidence ?? null,
      rawPayload: JSON.stringify(rawPayload || {})
    });

    return { id, productId, source, observedAt };
  },

  async findRecentByProductId(productId, limit = 50) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "price_history_observations",
        columns:
          "id, product_id, source, observed_at, current_price, lowest_price, average_price, highest_price, currency, confidence, raw_payload",
        filters: { product_id: productId },
        orderBy: "observed_at",
        ascending: false,
        limit
      });

      return rows.map(mapRow);
    }

    const statement = db.prepare(`
      SELECT
        id, product_id AS productId, source, observed_at AS observedAt,
        current_price AS currentPrice, lowest_price AS lowestPrice,
        average_price AS averagePrice, highest_price AS highestPrice,
        currency, confidence, raw_payload AS raw_payload
      FROM price_history_observations
      WHERE product_id = ?
      ORDER BY observed_at DESC
      LIMIT ?
    `);

    return statement.all(productId, limit).map(mapRow);
  }
};
