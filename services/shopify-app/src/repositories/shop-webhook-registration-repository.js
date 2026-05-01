import { db } from "../db/database.js";

export const shopWebhookRegistrationRepository = {
  upsert({ shopDomain, topic, webhookId, callbackUrl }) {
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

  findAll() {
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
