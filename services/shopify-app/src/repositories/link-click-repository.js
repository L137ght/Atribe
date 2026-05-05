import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { fetchMany, fetchOne, insertRow } from "./supabase/shared.js";

const mapSupabaseClick = (row) =>
  row
    ? {
        clickId: row.click_id,
        linkId: row.link_id,
        creatorId: row.creator_id,
        selectedCreatorId: row.selected_creator_id,
        userId: row.user_id,
        destinationUrl: row.destination_url,
        platformType: row.platform_type,
        brandId: row.brand_id,
        shopDomain: row.shop_domain,
        snapshotId: row.snapshot_id,
        fallbackReason: row.fallback_reason || null,
        clickedAt: row.clicked_at,
        ipHash: row.ip_hash,
        userAgent: row.user_agent,
        referrer: row.referrer || null
      }
    : null;

export const linkClickRepository = {
  async create({
    clickId,
    linkId = null,
    creatorId = null,
    selectedCreatorId = null,
    userId = null,
    destinationUrl = null,
    platformType = null,
    brandId = null,
    shopDomain = null,
    snapshotId = null,
    fallbackReason = null,
    ipHash,
    userAgent,
    referrer = null
  }) {
    if (env.dbProvider === "supabase") {
      await insertRow("shopify_link_clicks", {
        click_id: clickId,
        link_id: linkId,
        creator_id: creatorId,
        selected_creator_id: selectedCreatorId,
        user_id: userId,
        destination_url: destinationUrl,
        platform_type: platformType,
        brand_id: brandId,
        shop_domain: shopDomain,
        snapshot_id: snapshotId,
        fallback_reason: fallbackReason,
        ip_hash: ipHash,
        user_agent: userAgent,
        referrer,
        clicked_at: new Date().toISOString()
      });
      return;
    }

    const statement = db.prepare(`
      INSERT INTO link_clicks (
        click_id,
        link_id,
        creator_id,
        selected_creator_id,
        user_id,
        destination_url,
        platform_type,
        brand_id,
        shop_domain,
        snapshot_id,
        fallback_reason,
        clicked_at,
        ip_hash,
        user_agent
      )
      VALUES (
        @clickId,
        @linkId,
        @creatorId,
        @selectedCreatorId,
        @userId,
        @destinationUrl,
        @platformType,
        @brandId,
        @shopDomain,
        @snapshotId,
        @fallbackReason,
        @clickedAt,
        @ipHash,
        @userAgent
      )
    `);

    statement.run({
      clickId,
      linkId: linkId || null,
      creatorId: creatorId || null,
      selectedCreatorId: selectedCreatorId || null,
      userId: userId || null,
      destinationUrl: destinationUrl || null,
      platformType: platformType || null,
      brandId: brandId || null,
      shopDomain: shopDomain || null,
      snapshotId: snapshotId || null,
      fallbackReason: fallbackReason || null,
      clickedAt: new Date().toISOString(),
      ipHash,
      userAgent
    });
  },

  async findByClickId(clickId) {
    if (env.dbProvider === "supabase") {
      return mapSupabaseClick(
        await fetchOne(
          "shopify_link_clicks",
          "click_id, link_id, creator_id, selected_creator_id, user_id, destination_url, platform_type, brand_id, shop_domain, snapshot_id, fallback_reason, clicked_at, ip_hash, user_agent, referrer",
          { click_id: clickId }
        )
      );
    }

    const statement = db.prepare(`
      SELECT
        click_id AS clickId,
        link_id AS linkId,
        creator_id AS creatorId,
        selected_creator_id AS selectedCreatorId,
        user_id AS userId,
        destination_url AS destinationUrl,
        platform_type AS platformType,
        brand_id AS brandId,
        shop_domain AS shopDomain,
        snapshot_id AS snapshotId,
        fallback_reason AS fallbackReason,
        clicked_at AS clickedAt,
        ip_hash AS ipHash,
        user_agent AS userAgent
      FROM link_clicks
      WHERE click_id = ?
    `);

    return statement.get(clickId) || null;
  },

  async findLatestUserRouteClicks(limit = 20) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_link_clicks",
        columns: "click_id, user_id, selected_creator_id, destination_url, platform_type, brand_id, shop_domain, snapshot_id, fallback_reason, clicked_at",
        orderBy: "clicked_at",
        ascending: false,
        limit
      });

      return rows
        .filter((row) => row.user_id)
        .map((row) => ({
          clickId: row.click_id,
          userId: row.user_id,
          selectedCreatorId: row.selected_creator_id,
          destinationUrl: row.destination_url,
          platformType: row.platform_type,
          brandId: row.brand_id,
          shopDomain: row.shop_domain,
          snapshotId: row.snapshot_id,
          fallbackReason: row.fallback_reason || null,
          clickedAt: row.clicked_at
        }));
    }

    const statement = db.prepare(`
      SELECT
        click_id AS clickId,
        user_id AS userId,
        selected_creator_id AS selectedCreatorId,
        destination_url AS destinationUrl,
        platform_type AS platformType,
        brand_id AS brandId,
        shop_domain AS shopDomain,
        snapshot_id AS snapshotId,
        fallback_reason AS fallbackReason,
        clicked_at AS clickedAt
      FROM link_clicks
      WHERE user_id IS NOT NULL
      ORDER BY clicked_at DESC
      LIMIT ?
    `);

    return statement.all(limit);
  },

  async findByBrandFilter({ brandId = null, shopDomain = null, limit = 50 }) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_link_clicks",
        columns: "click_id, link_id, creator_id, selected_creator_id, user_id, destination_url, platform_type, brand_id, shop_domain, snapshot_id, fallback_reason, clicked_at, ip_hash, user_agent, referrer",
        filters: {
          ...(brandId ? { brand_id: brandId } : {}),
          ...(shopDomain ? { shop_domain: shopDomain } : {})
        },
        orderBy: "clicked_at",
        ascending: false,
        limit
      });

      return rows.map(mapSupabaseClick);
    }

    if (!brandId && !shopDomain) {
      const statement = db.prepare(`
        SELECT
          click_id AS clickId,
          link_id AS linkId,
          creator_id AS creatorId,
          selected_creator_id AS selectedCreatorId,
          user_id AS userId,
          destination_url AS destinationUrl,
          platform_type AS platformType,
          brand_id AS brandId,
          shop_domain AS shopDomain,
          snapshot_id AS snapshotId,
          fallback_reason AS fallbackReason,
          clicked_at AS clickedAt,
          ip_hash AS ipHash,
          user_agent AS userAgent
        FROM link_clicks
        ORDER BY clicked_at DESC
        LIMIT ?
      `);

      return statement.all(limit);
    }

    if (shopDomain) {
      const statement = db.prepare(`
        SELECT
          click_id AS clickId,
          link_id AS linkId,
          creator_id AS creatorId,
          selected_creator_id AS selectedCreatorId,
          user_id AS userId,
          destination_url AS destinationUrl,
          platform_type AS platformType,
          brand_id AS brandId,
          shop_domain AS shopDomain,
          snapshot_id AS snapshotId,
          fallback_reason AS fallbackReason,
          clicked_at AS clickedAt,
          ip_hash AS ipHash,
          user_agent AS userAgent
        FROM link_clicks
        WHERE shop_domain = ?
        ORDER BY clicked_at DESC
        LIMIT ?
      `);

      return statement.all(shopDomain, limit);
    }

    const statement = db.prepare(`
      SELECT
        click_id AS clickId,
        link_id AS linkId,
        creator_id AS creatorId,
        selected_creator_id AS selectedCreatorId,
        user_id AS userId,
        destination_url AS destinationUrl,
        platform_type AS platformType,
        brand_id AS brandId,
        shop_domain AS shopDomain,
        snapshot_id AS snapshotId,
        fallback_reason AS fallbackReason,
        clicked_at AS clickedAt,
        ip_hash AS ipHash,
        user_agent AS userAgent
      FROM link_clicks
      WHERE brand_id = ?
      ORDER BY clicked_at DESC
      LIMIT ?
    `);

    return statement.all(brandId, limit);
  }
};
