import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchMany, fetchOne, insertRow } from "./supabase/shared.js";

const mapSupabaseCommission = (row) =>
  row
    ? {
        commissionKey: row.commission_key,
        orderId: row.order_id,
        shopDomain: row.shop_domain,
        creatorId: row.creator_id,
        userId: row.user_id,
        brandId: row.brand_id,
        snapshotId: row.snapshot_id,
        eventType: row.commission_type,
        orderValue: row.order_value,
        currency: row.currency,
        commissionRate: row.commission_rate,
        creatorCommission: row.amount,
        platformFee: row.platform_fee,
        status: row.status,
        referenceId: row.reference_id,
        createdAt: row.created_at
      }
    : null;

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
  async findByCommissionKey(commissionKey) {
    if (env.dbProvider === "supabase") {
      return mapSupabaseCommission(
        await fetchOne(
          "shopify_order_commissions",
          "commission_key, order_id, shop_domain, creator_id, user_id, brand_id, snapshot_id, commission_type, order_value, commission_rate, amount, platform_fee, currency, status, reference_id, created_at",
          { commission_key: commissionKey }
        )
      );
    }

    const statement = db.prepare(`
      ${baseSelect}
      WHERE commission_key = ?
    `);

    return statement.get(commissionKey) || null;
  },

  async findSaleByOrderIdAndShopDomain(orderId, shopDomain) {
    return (await this.findSalesByOrderIdAndShopDomain(orderId, shopDomain))[0] || null;
  },

  async findSalesByOrderIdAndShopDomain(orderId, shopDomain) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_order_commissions",
        columns: "commission_key, order_id, shop_domain, creator_id, user_id, brand_id, snapshot_id, commission_type, order_value, commission_rate, amount, platform_fee, currency, status, reference_id, created_at",
        filters: {
          order_id: orderId,
          shop_domain: shopDomain,
          commission_type: "sale"
        },
        orderBy: "created_at",
        ascending: true
      });

      return rows.map(mapSupabaseCommission);
    }

    const statement = db.prepare(`
      ${baseSelect}
      WHERE order_id = ? AND shop_domain = ? AND event_type = 'sale'
      ORDER BY created_at ASC
    `);

    return statement.all(orderId, shopDomain);
  },

  async create({
    commissionKey,
    orderId,
    shopDomain,
    creatorId,
    userId,
    brandId = null,
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
    if (env.dbProvider === "supabase") {
      await insertRow("shopify_order_commissions", {
        commission_key: commissionKey,
        order_id: orderId,
        shop_domain: shopDomain,
        creator_id: creatorId,
        user_id: userId || null,
        brand_id: brandId || null,
        snapshot_id: snapshotId || null,
        commission_type: eventType,
        order_value: Number(orderValue),
        currency: currency || null,
        commission_rate: commissionRate,
        amount: Number(creatorCommission),
        platform_fee: Number(platformFee),
        status,
        reference_id: referenceId || null,
        created_at: new Date().toISOString()
      });
      return;
    }

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

  async findByCreatorId(creatorId) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_order_commissions",
        columns: "commission_key, order_id, shop_domain, creator_id, user_id, brand_id, snapshot_id, commission_type, order_value, commission_rate, amount, platform_fee, currency, status, reference_id, created_at",
        filters: {
          creator_id: creatorId
        },
        orderBy: "created_at",
        ascending: false
      });

      return rows.map(mapSupabaseCommission);
    }

    const statement = db.prepare(`
      ${baseSelect}
      WHERE creator_id = ?
      ORDER BY created_at DESC
    `);

    return statement.all(creatorId);
  },

  async findByBrandFilter({ brandId = null, shopDomain = null }) {
    if (env.dbProvider === "supabase") {
      const supabase = getSupabase();
      let query = supabase
        .from("shopify_order_commissions")
        .select("commission_key, order_id, shop_domain, creator_id, user_id, brand_id, snapshot_id, commission_type, order_value, commission_rate, amount, platform_fee, currency, status, reference_id, created_at");

      if (brandId) {
        query = query.eq("brand_id", brandId);
      }

      if (shopDomain) {
        query = query.eq("shop_domain", shopDomain);
      }

      query = query.order("created_at", { ascending: false });
      const { data, error } = await query;
      if (error) {
        throw new Error(`Supabase read failed for shopify_order_commissions: ${error.message}`);
      }
      return (data || []).map(mapSupabaseCommission);
    }

    if (shopDomain) {
      const statement = db.prepare(`
        ${baseSelect}
        WHERE shop_domain = ?
        ORDER BY created_at DESC
      `);
      return statement.all(shopDomain);
    }

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
      LEFT JOIN link_clicks lc
        ON lc.click_id = (
          SELECT click_id
          FROM order_attributions oa
          WHERE oa.order_id = oc.order_id AND oa.shop_domain = oc.shop_domain
        )
      WHERE lc.brand_id = ?
      ORDER BY oc.created_at DESC
    `);

    return statement.all(brandId);
  }
};
