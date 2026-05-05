import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { fetchMany, upsertRow } from "./supabase/shared.js";

export const shopWebhookRegistrationRepository = {
  async upsert({ shopDomain, topic, webhookId, callbackUrl }) {
    if (env.dbProvider === "supabase") {
      await upsertRow(
        "shopify_webhook_registrations",
        {
          shop_domain: shopDomain,
          topic,
          shopify_webhook_id: webhookId,
          callback_url: callbackUrl,
          created_at: new Date().toISOString()
        },
        "shop_domain,topic"
      );
      return;
    }

    const statement = db.prepare(`
      INSERT INTO shop_webhook_registrations (
        shop_domain,
        topic,
        webhook_id,
        callback_url,
        created_at
      )
      VALUES (
        @shopDomain,
        @topic,
        @webhookId,
        @callbackUrl,
        @createdAt
      )
      ON CONFLICT(shop_domain, topic) DO UPDATE SET
        webhook_id = excluded.webhook_id,
        callback_url = excluded.callback_url,
        created_at = excluded.created_at
    `);

    statement.run({
      shopDomain,
      topic,
      webhookId,
      callbackUrl,
      createdAt: new Date().toISOString()
    });
  },

  async findAll() {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_webhook_registrations",
        columns: "shop_domain, topic, shopify_webhook_id, callback_url, created_at",
        orderBy: "created_at",
        ascending: false
      });

      return rows.map((row) => ({
        shopDomain: row.shop_domain,
        topic: row.topic,
        webhookId: row.shopify_webhook_id,
        callbackUrl: row.callback_url,
        createdAt: row.created_at
      }));
    }

    const statement = db.prepare(`
      SELECT
        shop_domain AS shopDomain,
        topic,
        webhook_id AS webhookId,
        callback_url AS callbackUrl,
        created_at AS createdAt
      FROM shop_webhook_registrations
      ORDER BY created_at DESC
    `);

    return statement.all();
  }
};
