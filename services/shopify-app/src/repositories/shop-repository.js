import { db } from "../db/database.js";

export const shopRepository = {
  upsert({ shopDomain, accessToken, scope }) {
    const statement = db.prepare(`
      INSERT INTO shops (shop_domain, access_token, scope, installed_at)
      VALUES (@shopDomain, @accessToken, @scope, @installedAt)
      ON CONFLICT(shop_domain) DO UPDATE SET
        access_token = excluded.access_token,
        scope = excluded.scope,
        installed_at = excluded.installed_at
    `);

    statement.run({
      shopDomain,
      accessToken,
      scope,
      installedAt: new Date().toISOString()
    });
  },

  findByShopDomain(shopDomain) {
    const statement = db.prepare(`
      SELECT shop_domain AS shopDomain, access_token AS accessToken, scope, installed_at AS installedAt
      FROM shops
      WHERE shop_domain = ?
    `);

    return statement.get(shopDomain) || null;
  },

  deleteByShopDomain(shopDomain) {
    const deleteWebhooks = db.prepare(`
      DELETE FROM shop_webhook_registrations
      WHERE shop_domain = ?
    `);
    const deleteScriptTags = db.prepare(`
      DELETE FROM shop_script_tags
      WHERE shop_domain = ?
    `);
    const selectSnapshotIds = db.prepare(`
      SELECT DISTINCT snapshot_id AS snapshotId
      FROM link_clicks
      WHERE shop_domain = ? AND snapshot_id IS NOT NULL
    `);
    const deleteClicks = db.prepare(`
      DELETE FROM link_clicks
      WHERE shop_domain = ?
    `);
    const deleteSnapshot = db.prepare(`
      DELETE FROM click_weight_snapshots
      WHERE id = ?
    `);
    const deleteOrders = db.prepare(`
      DELETE FROM shopify_orders
      WHERE shop_domain = ?
    `);
    const deleteAttributions = db.prepare(`
      DELETE FROM order_attributions
      WHERE shop_domain = ?
    `);
    const deleteCommissions = db.prepare(`
      DELETE FROM order_commissions
      WHERE shop_domain = ?
    `);
    const deleteShop = db.prepare(`
      DELETE FROM shops
      WHERE shop_domain = ?
    `);

    db.exec("BEGIN");

    try {
      const snapshotIds = selectSnapshotIds.all(shopDomain);
      deleteCommissions.run(shopDomain);
      deleteAttributions.run(shopDomain);
      deleteOrders.run(shopDomain);
      deleteClicks.run(shopDomain);
      for (const snapshot of snapshotIds) {
        deleteSnapshot.run(snapshot.snapshotId);
      }
      deleteWebhooks.run(shopDomain);
      deleteScriptTags.run(shopDomain);
      deleteShop.run(shopDomain);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
};
