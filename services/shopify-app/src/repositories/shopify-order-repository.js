import { db } from "../db/database.js";

export const shopifyOrderRepository = {
  upsert({ orderId, shopDomain, totalPrice, currency }) {
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

    const now = new Date().toISOString();

    statement.run({
      orderId,
      shopDomain,
      totalPrice,
      currency: currency || null,
      createdAt: now,
      updatedAt: now
    });
  }
};
