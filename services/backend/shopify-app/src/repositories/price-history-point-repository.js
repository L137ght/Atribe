import crypto from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchMany } from "./supabase/shared.js";

const mapRow = (row) => ({
  id: row.id,
  productId: row.product_id ?? row.productId,
  source: row.source,
  date: row.price_date ?? row.priceDate,
  price: Number(row.price),
  currency: row.currency || "INR"
});

export const priceHistoryPointRepository = {
  async upsertMany({ productId, source, points = [], currency = "INR" }) {
    const normalizedPoints = points
      .map((point) => ({
        id: crypto.randomUUID(),
        product_id: productId,
        source,
        price_date: String(point.date || "").slice(0, 10),
        price: Number(point.price),
        currency
      }))
      .filter((point) => point.price_date && Number.isFinite(point.price) && point.price > 0);

    if (normalizedPoints.length === 0) {
      return 0;
    }

    if (env.dbProvider === "supabase") {
      const { error } = await getSupabase().from("price_history_points").upsert(normalizedPoints, {
        onConflict: "product_id,source,price_date,price",
        ignoreDuplicates: true
      });

      if (error) {
        throw new Error(`Supabase upsert failed for price_history_points: ${error.message}`);
      }

      return normalizedPoints.length;
    }

    const statement = db.prepare(`
      INSERT OR IGNORE INTO price_history_points (
        id, product_id, source, price_date, price, currency
      )
      VALUES (
        @id, @product_id, @source, @price_date, @price, @currency
      )
    `);

    for (const point of normalizedPoints) {
      statement.run(point);
    }

    return normalizedPoints.length;
  },

  async findByProductId(productId) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "price_history_points",
        columns: "id, product_id, source, price_date, price, currency",
        filters: { product_id: productId },
        orderBy: "price_date",
        ascending: true
      });

      return rows.map(mapRow);
    }

    const statement = db.prepare(`
      SELECT
        id, product_id AS productId, source, price_date AS priceDate,
        price, currency
      FROM price_history_points
      WHERE product_id = ?
      ORDER BY price_date ASC
    `);

    return statement.all(productId).map(mapRow);
  }
};
