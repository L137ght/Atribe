import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { fetchMany, fetchOne, insertRow } from "./supabase/shared.js";

export const linkRepository = {
  async create({ linkId, creatorId, brandId, destinationUrl }) {
    if (env.dbProvider === "supabase") {
      await insertRow("shopify_links", {
        link_id: linkId,
        creator_id: creatorId || null,
        brand_id: brandId || null,
        destination_url: destinationUrl,
        tracking_link: null,
        link_type: "creator_owned",
        created_at: new Date().toISOString()
      });
      return;
    }

    const statement = db.prepare(`
      INSERT INTO links (link_id, creator_id, brand_id, destination_url, created_at)
      VALUES (@linkId, @creatorId, @brandId, @destinationUrl, @createdAt)
    `);

    statement.run({
      linkId,
      creatorId,
      brandId,
      destinationUrl,
      createdAt: new Date().toISOString()
    });
  },

  async findByCreatorAndLinkId({ creatorId, linkId }) {
    if (env.dbProvider === "supabase") {
      const row = await fetchOne(
        "shopify_links",
        "link_id, creator_id, brand_id, destination_url, created_at",
        {
          creator_id: creatorId,
          link_id: linkId
        }
      );

      return row
        ? {
            linkId: row.link_id,
            creatorId: row.creator_id,
            brandId: row.brand_id,
            destinationUrl: row.destination_url,
            createdAt: row.created_at
          }
        : null;
    }

    const statement = db.prepare(`
      SELECT
        link_id AS linkId,
        creator_id AS creatorId,
        brand_id AS brandId,
        destination_url AS destinationUrl,
        created_at AS createdAt
      FROM links
      WHERE creator_id = ? AND link_id = ?
    `);

    return statement.get(creatorId, linkId) || null;
  },

  async findByCreatorId(creatorId) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_links",
        columns: "link_id, creator_id, brand_id, shop_domain, destination_url, tracking_link, link_type, created_at",
        filters: {
          creator_id: creatorId
        },
        orderBy: "created_at",
        ascending: false
      });

      return rows.map((row) => ({
        linkId: row.link_id,
        creatorId: row.creator_id,
        brandId: row.brand_id,
        shopDomain: row.shop_domain,
        destinationUrl: row.destination_url,
        trackingLink: row.tracking_link,
        linkType: row.link_type,
        createdAt: row.created_at
      }));
    }

    const statement = db.prepare(`
      SELECT
        link_id AS linkId,
        creator_id AS creatorId,
        brand_id AS brandId,
        destination_url AS destinationUrl,
        created_at AS createdAt
      FROM links
      WHERE creator_id = ?
      ORDER BY created_at DESC
    `);

    return statement.all(creatorId);
  },

  async findLatest(limit = 20) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_links",
        columns: "link_id, creator_id, brand_id, shop_domain, destination_url, tracking_link, link_type, created_at",
        orderBy: "created_at",
        ascending: false,
        limit
      });

      return rows.map((row) => ({
        linkId: row.link_id,
        creatorId: row.creator_id,
        brandId: row.brand_id,
        shopDomain: row.shop_domain,
        destinationUrl: row.destination_url,
        trackingLink: row.tracking_link,
        linkType: row.link_type,
        createdAt: row.created_at
      }));
    }

    const statement = db.prepare(`
      SELECT
        link_id AS linkId,
        creator_id AS creatorId,
        brand_id AS brandId,
        destination_url AS destinationUrl,
        created_at AS createdAt
      FROM links
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return statement.all(limit);
  }
};
