import crypto from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { fetchMany, fetchOne, upsertRow } from "./supabase/shared.js";

const now = () => new Date().toISOString();

const mapSupabaseLink = (row) =>
  row
    ? {
        id: row.id,
        brandId: row.brand_id,
        shopDomain: row.shop_domain,
        creatorId: row.creator_id,
        status: row.status,
        defaultCommissionRate: row.default_commission_rate,
        couponCode: row.coupon_code,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    : null;

export const creatorBrandLinkRepository = {
  async findActiveByShopDomain(shopDomain) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_creator_brand_links",
        columns:
          "id, brand_id, shop_domain, creator_id, status, default_commission_rate, coupon_code, created_at, updated_at",
        filters: {
          shop_domain: shopDomain,
          status: "active"
        },
        orderBy: "created_at",
        ascending: true
      });

      return rows.map(mapSupabaseLink);
    }

    const statement = db.prepare(`
      SELECT
        id,
        brand_id AS brandId,
        shop_domain AS shopDomain,
        creator_id AS creatorId,
        status,
        default_commission_rate AS defaultCommissionRate,
        coupon_code AS couponCode,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM creator_brand_links
      WHERE shop_domain = ? AND status = 'active'
      ORDER BY created_at ASC
    `);

    return statement.all(shopDomain);
  },

  async findByCreatorId(creatorId) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_creator_brand_links",
        columns:
          "id, brand_id, shop_domain, creator_id, status, default_commission_rate, coupon_code, created_at, updated_at",
        filters: { creator_id: creatorId },
        orderBy: "created_at",
        ascending: false
      });

      return rows.map(mapSupabaseLink);
    }

    const statement = db.prepare(`
      SELECT
        id,
        brand_id AS brandId,
        shop_domain AS shopDomain,
        creator_id AS creatorId,
        status,
        default_commission_rate AS defaultCommissionRate,
        coupon_code AS couponCode,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM creator_brand_links
      WHERE creator_id = ?
      ORDER BY created_at DESC
    `);

    return statement.all(creatorId);
  },

  async findById(id) {
    if (env.dbProvider === "supabase") {
      return mapSupabaseLink(
        await fetchOne(
          "shopify_creator_brand_links",
          "id, brand_id, shop_domain, creator_id, status, default_commission_rate, coupon_code, created_at, updated_at",
          { id }
        )
      );
    }

    const statement = db.prepare(`
      SELECT
        id,
        brand_id AS brandId,
        shop_domain AS shopDomain,
        creator_id AS creatorId,
        status,
        default_commission_rate AS defaultCommissionRate,
        coupon_code AS couponCode,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM creator_brand_links
      WHERE id = ?
    `);

    return statement.get(id) || null;
  },

  async upsert({
    id = null,
    brandId = null,
    shopDomain,
    creatorId,
    status,
    defaultCommissionRate = null,
    couponCode = null
  }) {
    const timestamp = now();

    if (env.dbProvider === "supabase") {
      const existingRows = await fetchMany({
        tableName: "shopify_creator_brand_links",
        columns:
          "id, brand_id, shop_domain, creator_id, status, default_commission_rate, coupon_code, created_at, updated_at",
        filters: {
          creator_id: creatorId,
          shop_domain: shopDomain
        },
        limit: 1
      });
      const existing = existingRows[0] ? mapSupabaseLink(existingRows[0]) : null;

      await upsertRow(
        "shopify_creator_brand_links",
        {
          id: id || existing?.id || crypto.randomUUID(),
          brand_id: brandId ?? existing?.brandId ?? null,
          shop_domain: shopDomain,
          creator_id: creatorId,
          status: status ?? existing?.status ?? "active",
          default_commission_rate:
            defaultCommissionRate ?? existing?.defaultCommissionRate ?? null,
          coupon_code: couponCode ?? existing?.couponCode ?? null,
          created_at: existing?.createdAt || timestamp,
          updated_at: timestamp
        },
        "id"
      );

      const resolvedId = id || existing?.id || null;
      if (resolvedId) {
        return this.findById(resolvedId);
      }

      const createdRows = await fetchMany({
          tableName: "shopify_creator_brand_links",
          columns:
            "id, brand_id, shop_domain, creator_id, status, default_commission_rate, coupon_code, created_at, updated_at",
          filters: { creator_id: creatorId, shop_domain: shopDomain },
          limit: 1
        });

      return mapSupabaseLink(createdRows[0] || null);
    }

    const existing = db
      .prepare(`
        SELECT id FROM creator_brand_links
        WHERE creator_id = ? AND shop_domain = ?
      `)
      .get(creatorId, shopDomain);

    const resolvedId = id || existing?.id || crypto.randomUUID();
    const statement = db.prepare(`
      INSERT INTO creator_brand_links (
        id,
        brand_id,
        shop_domain,
        creator_id,
        status,
        default_commission_rate,
        coupon_code,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @brandId,
        @shopDomain,
        @creatorId,
        @status,
        @defaultCommissionRate,
        @couponCode,
        @createdAt,
        @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        brand_id = COALESCE(excluded.brand_id, creator_brand_links.brand_id),
        shop_domain = excluded.shop_domain,
        creator_id = excluded.creator_id,
        status = excluded.status,
        default_commission_rate = COALESCE(excluded.default_commission_rate, creator_brand_links.default_commission_rate),
        coupon_code = COALESCE(excluded.coupon_code, creator_brand_links.coupon_code),
        updated_at = excluded.updated_at
    `);

    statement.run({
      id: resolvedId,
      brandId,
      shopDomain,
      creatorId,
      status: status || "active",
      defaultCommissionRate,
      couponCode,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    return this.findById(resolvedId);
  }
};
