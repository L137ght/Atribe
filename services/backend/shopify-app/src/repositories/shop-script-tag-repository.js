import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { fetchMany, fetchOne, upsertRow } from "./supabase/shared.js";

export const shopScriptTagRepository = {
  async upsert({ shopDomain, scriptTagId, src, displayScope = "ONLINE_STORE" }) {
    if (env.dbProvider === "supabase") {
      await upsertRow(
        "shopify_script_tags",
        {
          shop_domain: shopDomain,
          shopify_script_tag_id: scriptTagId,
          src,
          display_scope: displayScope,
          created_at: new Date().toISOString()
        },
        "shop_domain"
      );
      return;
    }

    const statement = db.prepare(`
      INSERT INTO shop_script_tags (shop_domain, script_tag_id, src, created_at)
      VALUES (@shopDomain, @scriptTagId, @src, @createdAt)
      ON CONFLICT(shop_domain) DO UPDATE SET
        script_tag_id = excluded.script_tag_id,
        src = excluded.src,
        created_at = excluded.created_at
    `);

    statement.run({
      shopDomain,
      scriptTagId,
      src,
      createdAt: new Date().toISOString()
    });
  },

  async findByShopDomain(shopDomain) {
    if (env.dbProvider === "supabase") {
      const row = await fetchOne(
        "shopify_script_tags",
        "shop_domain, shopify_script_tag_id, src, display_scope, created_at",
        { shop_domain: shopDomain }
      );

      return row
        ? {
            shopDomain: row.shop_domain,
            scriptTagId: row.shopify_script_tag_id,
            src: row.src,
            displayScope: row.display_scope,
            createdAt: row.created_at
          }
        : null;
    }

    const statement = db.prepare(`
      SELECT
        shop_domain AS shopDomain,
        script_tag_id AS scriptTagId,
        src,
        created_at AS createdAt
      FROM shop_script_tags
      WHERE shop_domain = ?
    `);

    return statement.get(shopDomain) || null;
  },

  async findAll() {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_script_tags",
        columns: "shop_domain, shopify_script_tag_id, src, display_scope, created_at",
        orderBy: "created_at",
        ascending: false
      });

      return rows.map((row) => ({
        shopDomain: row.shop_domain,
        scriptTagId: row.shopify_script_tag_id,
        src: row.src,
        displayScope: row.display_scope,
        createdAt: row.created_at
      }));
    }

    const statement = db.prepare(`
      SELECT
        shop_domain AS shopDomain,
        script_tag_id AS scriptTagId,
        src,
        created_at AS createdAt
      FROM shop_script_tags
      ORDER BY created_at DESC
    `);

    return statement.all();
  }
};
