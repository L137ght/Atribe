import { db } from "../db/database.js";

const baseSelect = `
  SELECT
    commission_key AS commissionKey,
    order_id AS orderId,
    shop_domain AS shopDomain,
    creator_id AS creatorId,
    user_id AS userId,
    snapshot_id AS snapshotId,
    event_type AS eventType,
    order_value AS orderValue,
    currency,
    commission_rate AS commissionRate,
    creator_commission AS creatorCommission,
    platform_fee AS platformFee,
    status,
    reference_id AS referenceId,
    created_at AS createdAt
  FROM order_commissions
`;

export const orderCommissionRepository = {
  findByCommissionKey(commissionKey) {
    const statement = db.prepare(`
      ${baseSelect}
      WHERE commission_key = ?
    `);

    return statement.get(commissionKey) || null;
  },

  findSaleByOrderIdAndShopDomain(orderId, shopDomain) {
    return this.findSalesByOrderIdAndShopDomain(orderId, shopDomain)[0] || null;
  },

  findSalesByOrderIdAndShopDomain(orderId, shopDomain) {
    const statement = db.prepare(`
      ${baseSelect}
      WHERE order_id = ? AND shop_domain = ? AND event_type = 'sale'
      ORDER BY created_at ASC
    `);

    return statement.all(orderId, shopDomain);
  },

  create({
    commissionKey,
    orderId,
    shopDomain,
    creatorId,
    userId,
    snapshotId,
    eventType,
    orderValue,
    currency,
    commissionRate,
    creatorCommission,
    platformFee,
    status,
    referenceId
  }) {
    const statement = db.prepare(`
      INSERT INTO order_commissions (
        commission_key,
        order_id,
        shop_domain,
        creator_id,
        user_id,
        snapshot_id,
        event_type,
        order_value,
        currency,
        commission_rate,
        creator_commission,
        platform_fee,
        status,
        reference_id,
        created_at
      )
      VALUES (
        @commissionKey,
        @orderId,
        @shopDomain,
        @creatorId,
        @userId,
        @snapshotId,
        @eventType,
        @orderValue,
        @currency,
        @commissionRate,
        @creatorCommission,
        @platformFee,
        @status,
        @referenceId,
        @createdAt
      )
    `);

    statement.run({
      commissionKey,
      orderId,
      shopDomain,
      creatorId,
      userId: userId || null,
      snapshotId: snapshotId || null,
      eventType,
      orderValue,
      currency: currency || null,
      commissionRate,
      creatorCommission,
      platformFee,
      status,
      referenceId: referenceId || null,
      createdAt: new Date().toISOString()
    });
  },

  findByCreatorId(creatorId) {
    const statement = db.prepare(`
      ${baseSelect}
      WHERE creator_id = ?
      ORDER BY created_at DESC
    `);

    return statement.all(creatorId);
  },

  findByBrandId(brandId) {
    const statement = db.prepare(`
      SELECT
        oc.commission_key AS commissionKey,
        oc.order_id AS orderId,
        oc.shop_domain AS shopDomain,
        oc.creator_id AS creatorId,
        oc.user_id AS userId,
        oc.snapshot_id AS snapshotId,
        oc.event_type AS eventType,
        oc.order_value AS orderValue,
        oc.currency AS currency,
        oc.commission_rate AS commissionRate,
        oc.creator_commission AS creatorCommission,
        oc.platform_fee AS platformFee,
        oc.status AS status,
        oc.reference_id AS referenceId,
        oc.created_at AS createdAt,
        lc.brand_id AS brandId
      FROM order_commissions oc
      LEFT JOIN order_attributions oa
        ON oa.order_id = oc.order_id AND oa.shop_domain = oc.shop_domain
      LEFT JOIN link_clicks lc
        ON lc.click_id = oa.click_id
      WHERE lc.brand_id = ?
      ORDER BY oc.created_at DESC
    `);

    return statement.all(brandId);
  }
};
