import { db } from "../db/database.js";

export const shopScriptTagRepository = {
  upsert({ shopDomain, scriptTagId, src }) {
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

  findByShopDomain(shopDomain) {
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

  findAll() {
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
