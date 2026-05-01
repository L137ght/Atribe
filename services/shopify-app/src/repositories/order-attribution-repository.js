import { db } from "../db/database.js";

export const orderAttributionRepository = {
  findByOrderIdAndShopDomain(orderId, shopDomain) {
    const statement = db.prepare(`
      SELECT
        order_id AS orderId,
        shop_domain AS shopDomain,
        creator_id AS creatorId,
        user_id AS userId,
        platform_type AS platformType,
        attribution_source AS attributionSource,
        order_value AS orderValue,
        currency,
        click_id AS clickId,
        snapshot_id AS snapshotId,
        atribe_ref AS atribeRef,
        coupon_code AS couponCode,
        processed_at AS processedAt
      FROM order_attributions
      WHERE order_id = ? AND shop_domain = ?
    `);

    return statement.get(orderId, shopDomain) || null;
  },

  create({
    orderId,
    shopDomain,
    creatorId,
    userId,
    platformType,
    attributionSource,
    orderValue,
    currency,
    clickId,
    snapshotId,
    atribeRef,
    couponCode
  }) {
    const statement = db.prepare(`
      INSERT INTO order_attributions (
        order_id,
        shop_domain,
        creator_id,
        user_id,
        platform_type,
        attribution_source,
        order_value,
        currency,
        click_id,
        snapshot_id,
        atribe_ref,
        coupon_code,
        processed_at
      )
      VALUES (
        @orderId,
        @shopDomain,
        @creatorId,
        @userId,
        @platformType,
        @attributionSource,
        @orderValue,
        @currency,
        @clickId,
        @snapshotId,
        @atribeRef,
        @couponCode,
        @processedAt
      )
    `);

    statement.run({
      orderId,
      shopDomain,
      creatorId: creatorId || null,
      userId: userId || null,
      platformType: platformType || null,
      attributionSource,
      orderValue,
      currency: currency || null,
      clickId: clickId || null,
      snapshotId: snapshotId || null,
      atribeRef: atribeRef || null,
      couponCode: couponCode || null,
      processedAt: new Date().toISOString()
    });
  },

  findOrdersByCreatorId(creatorId) {
    const statement = db.prepare(`
      SELECT
        oa.order_id AS orderId,
        oa.shop_domain AS shopDomain,
        oa.creator_id AS creatorId,
        oa.user_id AS userId,
        oa.platform_type AS platformType,
        oa.attribution_source AS attributionSource,
        oa.order_value AS orderValue,
        oa.currency AS currency,
        oa.click_id AS clickId,
        oa.snapshot_id AS snapshotId,
        oa.atribe_ref AS atribeRef,
        oa.coupon_code AS couponCode,
        oa.processed_at AS processedAt,
        oc.creator_commission AS creatorCommission,
        oc.platform_fee AS platformFee,
        oc.status AS commissionStatus
      FROM order_attributions oa
      LEFT JOIN order_commissions oc
        ON oc.order_id = oa.order_id
        AND oc.shop_domain = oa.shop_domain
        AND oc.event_type = 'sale'
      WHERE oa.creator_id = ?
      ORDER BY oa.processed_at DESC
    `);

    return statement.all(creatorId);
  },

  findOrdersByBrandId(brandId) {
    const statement = db.prepare(`
      SELECT
        oa.order_id AS orderId,
        oa.shop_domain AS shopDomain,
        oa.creator_id AS creatorId,
        oa.user_id AS userId,
        oa.platform_type AS platformType,
        oa.attribution_source AS attributionSource,
        oa.order_value AS orderValue,
        oa.currency AS currency,
        oa.click_id AS clickId,
        oa.snapshot_id AS snapshotId,
        oa.atribe_ref AS atribeRef,
        oa.coupon_code AS couponCode,
        oa.processed_at AS processedAt,
        oc.creator_commission AS creatorCommission,
        oc.platform_fee AS platformFee,
        oc.status AS commissionStatus,
        lc.brand_id AS brandId
      FROM order_attributions oa
      LEFT JOIN link_clicks lc
        ON lc.click_id = oa.click_id
      LEFT JOIN order_commissions oc
        ON oc.order_id = oa.order_id
        AND oc.shop_domain = oa.shop_domain
        AND oc.event_type = 'sale'
      WHERE lc.brand_id = ?
      ORDER BY oa.processed_at DESC
    `);

    return statement.all(brandId);
  }
};
