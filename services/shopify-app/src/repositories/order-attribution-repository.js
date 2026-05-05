import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchMany, fetchOne, insertRow } from "./supabase/shared.js";

export const orderAttributionRepository = {
  async findByOrderIdAndShopDomain(orderId, shopDomain) {
    if (env.dbProvider === "supabase") {
      const row = await fetchOne(
        "shopify_order_attributions",
        "shop_domain, order_id, creator_id, user_id, brand_id, platform_type, attribution_source, order_value, currency, click_id, snapshot_id, fallback_reason, created_at",
        {
          order_id: orderId,
          shop_domain: shopDomain
        }
      );

      return row
        ? {
            orderId: row.order_id,
            shopDomain: row.shop_domain,
            creatorId: row.creator_id,
            userId: row.user_id,
            brandId: row.brand_id,
            platformType: row.platform_type,
            attributionSource: row.attribution_source,
            orderValue: row.order_value,
            currency: row.currency,
            clickId: row.click_id,
            snapshotId: row.snapshot_id,
            fallbackReason: row.fallback_reason || null,
            atribeRef: null,
            couponCode: null,
            processedAt: row.created_at
          }
        : null;
    }

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
        fallback_reason AS fallbackReason,
        atribe_ref AS atribeRef,
        coupon_code AS couponCode,
        processed_at AS processedAt
      FROM order_attributions
      WHERE order_id = ? AND shop_domain = ?
    `);

    return statement.get(orderId, shopDomain) || null;
  },

  async create({
    orderId,
    shopDomain,
    creatorId,
    userId,
    brandId = null,
    platformType,
    attributionSource,
    orderValue,
    currency,
    clickId,
    snapshotId,
    fallbackReason = null,
    atribeRef,
    couponCode
  }) {
    if (env.dbProvider === "supabase") {
      await insertRow("shopify_order_attributions", {
        shop_domain: shopDomain,
        order_id: orderId,
        creator_id: creatorId || null,
        user_id: userId || null,
        brand_id: brandId || null,
        platform_type: platformType || null,
        attribution_source: attributionSource,
        order_value: Number(orderValue),
        currency: currency || null,
        click_id: clickId || null,
        snapshot_id: snapshotId || null,
        fallback_reason: fallbackReason,
        created_at: new Date().toISOString()
      });
      return;
    }

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
        fallback_reason,
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
        @fallbackReason,
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
      fallbackReason: fallbackReason || null,
      atribeRef: atribeRef || null,
      couponCode: couponCode || null,
      processedAt: new Date().toISOString()
    });
  },

  async findLatest(limit = 20) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_order_attributions",
        columns: "shop_domain, order_id, creator_id, user_id, brand_id, platform_type, attribution_source, order_value, currency, click_id, snapshot_id, fallback_reason, created_at",
        orderBy: "created_at",
        ascending: false,
        limit
      });

      return rows.map((row) => ({
        orderId: row.order_id,
        shopDomain: row.shop_domain,
        creatorId: row.creator_id,
        userId: row.user_id,
        brandId: row.brand_id,
        platformType: row.platform_type,
        attributionSource: row.attribution_source,
        orderValue: row.order_value,
        currency: row.currency,
        clickId: row.click_id,
        snapshotId: row.snapshot_id,
        fallbackReason: row.fallback_reason || null,
        atribeRef: null,
        couponCode: null,
        processedAt: row.created_at
      }));
    }

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
        fallback_reason AS fallbackReason,
        atribe_ref AS atribeRef,
        coupon_code AS couponCode,
        processed_at AS processedAt
      FROM order_attributions
      ORDER BY processed_at DESC
      LIMIT ?
    `);

    return statement.all(limit);
  },

  async findByBrandFilter({ brandId = null, shopDomain = null, limit = 50 }) {
    if (env.dbProvider === "supabase") {
      const supabase = getSupabase();
      let query = supabase
        .from("shopify_order_attributions")
        .select("shop_domain, order_id, creator_id, user_id, brand_id, platform_type, attribution_source, order_value, currency, click_id, snapshot_id, fallback_reason, created_at");

      if (brandId) {
        query = query.eq("brand_id", brandId);
      }

      if (shopDomain) {
        query = query.eq("shop_domain", shopDomain);
      }

      query = query.order("created_at", { ascending: false }).limit(limit);
      const { data, error } = await query;
      if (error) {
        throw new Error(`Supabase read failed for shopify_order_attributions: ${error.message}`);
      }

      return (data || []).map((row) => ({
        orderId: row.order_id,
        shopDomain: row.shop_domain,
        creatorId: row.creator_id,
        userId: row.user_id,
        brandId: row.brand_id,
        platformType: row.platform_type,
        attributionSource: row.attribution_source,
        orderValue: row.order_value,
        currency: row.currency,
        clickId: row.click_id,
        snapshotId: row.snapshot_id,
        fallbackReason: row.fallback_reason || null,
        atribeRef: null,
        couponCode: null,
        processedAt: row.created_at
      }));
    }

    if (shopDomain) {
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
          fallback_reason AS fallbackReason,
          atribe_ref AS atribeRef,
          coupon_code AS couponCode,
          processed_at AS processedAt
        FROM order_attributions
        WHERE shop_domain = ?
        ORDER BY processed_at DESC
        LIMIT ?
      `);

      return statement.all(shopDomain, limit);
    }

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
        oa.fallback_reason AS fallbackReason,
        oa.atribe_ref AS atribeRef,
        oa.coupon_code AS couponCode,
        oa.processed_at AS processedAt
      FROM order_attributions oa
      LEFT JOIN link_clicks lc
        ON lc.click_id = oa.click_id
      WHERE lc.brand_id = ?
      ORDER BY oa.processed_at DESC
      LIMIT ?
    `);

    return statement.all(brandId, limit);
  }
};
