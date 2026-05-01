import { db } from "../db/database.js";

export const linkClickRepository = {
  create({
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
    ipHash,
    userAgent
  }) {
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
      clickedAt: new Date().toISOString(),
      ipHash,
      userAgent
    });
  },

  findByClickId(clickId) {
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
        clicked_at AS clickedAt,
        ip_hash AS ipHash,
        user_agent AS userAgent
      FROM link_clicks
      WHERE click_id = ?
    `);

    return statement.get(clickId) || null;
  },

  findLatestUserRouteClicks(limit = 20) {
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
        clicked_at AS clickedAt
      FROM link_clicks
      WHERE user_id IS NOT NULL
      ORDER BY clicked_at DESC
      LIMIT ?
    `);

    return statement.all(limit);
  }
};
