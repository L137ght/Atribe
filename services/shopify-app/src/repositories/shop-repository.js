import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchMany, fetchOne, upsertRow } from "./supabase/shared.js";

export const shopRepository = {
  async upsert({ shopDomain, accessToken, scope }) {
    if (env.dbProvider === "supabase") {
      const installedAt = new Date().toISOString();

      await upsertRow(
        "shopify_shops",
        {
          shop_domain: shopDomain,
          access_token: accessToken,
          scopes: scope || null,
          installed_at: installedAt,
          uninstalled_at: null,
          updated_at: installedAt,
          created_at: installedAt
        },
        "shop_domain"
      );

      await upsertRow(
        "shopify_brand_integrations",
        {
          shop_domain: shopDomain,
          integration_status: "active",
          installed_at: installedAt,
          uninstalled_at: null,
          updated_at: installedAt,
          created_at: installedAt
        },
        "shop_domain"
      );

      return;
    }

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

    db.prepare(`
      INSERT INTO brand_integrations (
        shop_domain,
        integration_status,
        installed_at,
        uninstalled_at,
        created_at,
        updated_at
      )
      VALUES (
        @shopDomain,
        'active',
        @installedAt,
        NULL,
        @createdAt,
        @updatedAt
      )
      ON CONFLICT(shop_domain) DO UPDATE SET
        integration_status = 'active',
        installed_at = COALESCE(excluded.installed_at, brand_integrations.installed_at),
        uninstalled_at = NULL,
        updated_at = excluded.updated_at
    `).run({
      shopDomain,
      installedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  async findByShopDomain(shopDomain) {
    if (env.dbProvider === "supabase") {
      const row = await fetchOne(
        "shopify_shops",
        "shop_domain, access_token, scopes, installed_at, uninstalled_at, created_at, updated_at",
        { shop_domain: shopDomain }
      );

      return row
        ? {
            shopDomain: row.shop_domain,
            accessToken: row.access_token,
            scope: row.scopes,
            installedAt: row.installed_at,
            uninstalledAt: row.uninstalled_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }
        : null;
    }

    const statement = db.prepare(`
      SELECT shop_domain AS shopDomain, access_token AS accessToken, scope, installed_at AS installedAt
      FROM shops
      WHERE shop_domain = ?
    `);

    return statement.get(shopDomain) || null;
  },

  async findAll() {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_shops",
        columns: "shop_domain, access_token, scopes, installed_at, uninstalled_at, created_at, updated_at",
        orderBy: "installed_at",
        ascending: false
      });

      return rows.map((row) => ({
        shopDomain: row.shop_domain,
        accessToken: row.access_token,
        scope: row.scopes,
        installedAt: row.installed_at,
        uninstalledAt: row.uninstalled_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    }

    const statement = db.prepare(`
      SELECT shop_domain AS shopDomain, access_token AS accessToken, scope, installed_at AS installedAt
      FROM shops
      ORDER BY installed_at DESC
    `);

    return statement.all();
  },

  async deleteByShopDomain(shopDomain) {
    if (env.dbProvider === "supabase") {
      const supabase = getSupabase();
      const timestamp = new Date().toISOString();

      const { error: shopError } = await supabase
        .from("shopify_shops")
        .update({
          access_token: null,
          uninstalled_at: timestamp,
          updated_at: timestamp
        })
        .eq("shop_domain", shopDomain);

      if (shopError) {
        throw new Error(`Supabase update failed for shopify_shops: ${shopError.message}`);
      }

      const { error: integrationError } = await supabase
        .from("shopify_brand_integrations")
        .upsert({
          shop_domain: shopDomain,
          integration_status: "uninstalled",
          uninstalled_at: timestamp,
          updated_at: timestamp,
          created_at: timestamp
        }, {
          onConflict: "shop_domain",
          ignoreDuplicates: false
        });

      if (integrationError) {
        throw new Error(`Supabase upsert failed for shopify_brand_integrations: ${integrationError.message}`);
      }

      return;
    }

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
      db.prepare(`
        INSERT INTO brand_integrations (
          shop_domain,
          integration_status,
          uninstalled_at,
          created_at,
          updated_at
        )
        VALUES (
          @shopDomain,
          'uninstalled',
          @timestamp,
          @timestamp,
          @timestamp
        )
        ON CONFLICT(shop_domain) DO UPDATE SET
          integration_status = 'uninstalled',
          uninstalled_at = excluded.uninstalled_at,
          updated_at = excluded.updated_at
      `).run({
        shopDomain,
        timestamp: new Date().toISOString()
      });
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
