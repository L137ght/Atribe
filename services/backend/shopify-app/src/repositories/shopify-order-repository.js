import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { fetchMany, upsertRow } from "./supabase/shared.js";

export const shopifyOrderRepository = {
  async upsert({ orderId, shopDomain, totalPrice, currency, rawPayload = null }) {
    if (env.dbProvider === "supabase") {
      await upsertRow(
        "shopify_orders",
        {
          shop_domain: shopDomain,
          order_id: orderId,
          order_value: Number(totalPrice),
          currency: currency || null,
          raw_payload: rawPayload,
          created_at: new Date().toISOString()
        },
        "shop_domain,order_id"
      );
      return;
    }

    const statement = db.prepare(`
      INSERT INTO shopify_orders (
        order_id,
        shop_domain,
        total_price,
        currency,
        created_at,
        updated_at
      )
      VALUES (
        @orderId,
        @shopDomain,
        @totalPrice,
        @currency,
        @createdAt,
        @updatedAt
      )
      ON CONFLICT(order_id, shop_domain) DO UPDATE SET
        total_price = excluded.total_price,
        currency = excluded.currency,
        updated_at = excluded.updated_at
    `);

    const timestamp = new Date().toISOString();

    statement.run({
      orderId,
      shopDomain,
      totalPrice,
      currency: currency || null,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  },

  async findLatest(limit = 20) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_orders",
        columns: "shop_domain, order_id, order_value, currency, created_at",
        orderBy: "created_at",
        ascending: false,
        limit
      });

      return rows.map((row) => ({
        shopDomain: row.shop_domain,
        orderId: row.order_id,
        totalPrice: row.order_value,
        currency: row.currency,
        createdAt: row.created_at,
        updatedAt: row.created_at
      }));
    }

    const statement = db.prepare(`
      SELECT
        order_id AS orderId,
        shop_domain AS shopDomain,
        total_price AS totalPrice,
        currency,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM shopify_orders
      ORDER BY updated_at DESC
      LIMIT ?
    `);

    return statement.all(limit);
  }
};
