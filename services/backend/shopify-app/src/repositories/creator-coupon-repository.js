import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { fetchMany, fetchOne, insertRow, upsertRow } from "./supabase/shared.js";

export const creatorCouponRepository = {
  async upsert({ couponCode, creatorId, shopDomain = null, brandId = null }) {
    if (env.dbProvider === "supabase") {
      if (shopDomain) {
        await upsertRow(
          "shopify_creator_coupon_mappings",
          {
            shop_domain: shopDomain,
            brand_id: brandId,
            coupon_code: couponCode,
            creator_id: creatorId,
            created_at: new Date().toISOString()
          },
          "shop_domain,coupon_code"
        );
      } else {
        const existing = await fetchOne(
          "shopify_creator_coupon_mappings",
          "id, coupon_code, creator_id",
          { coupon_code: couponCode }
        );

        if (!existing) {
          await insertRow("shopify_creator_coupon_mappings", {
            shop_domain: null,
            brand_id: brandId,
            coupon_code: couponCode,
            creator_id: creatorId,
            created_at: new Date().toISOString()
          });
        }
      }
      return;
    }

    const statement = db.prepare(`
      INSERT INTO creator_coupon_mappings (coupon_code, creator_id, created_at)
      VALUES (@couponCode, @creatorId, @createdAt)
      ON CONFLICT(coupon_code) DO UPDATE SET
        creator_id = excluded.creator_id,
        created_at = excluded.created_at
    `);

    statement.run({
      couponCode,
      creatorId,
      createdAt: new Date().toISOString()
    });
  },

  async findByCouponCode(couponCode) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_creator_coupon_mappings",
        columns: "coupon_code, creator_id, shop_domain, brand_id, created_at",
        filters: { coupon_code: couponCode },
        orderBy: "created_at",
        ascending: false,
        limit: 1
      });
      const row = rows[0] || null;

      return row
        ? {
            couponCode: row.coupon_code,
            creatorId: row.creator_id,
            shopDomain: row.shop_domain,
            brandId: row.brand_id,
            createdAt: row.created_at
          }
        : null;
    }

    const statement = db.prepare(`
      SELECT coupon_code AS couponCode, creator_id AS creatorId, created_at AS createdAt
      FROM creator_coupon_mappings
      WHERE coupon_code = ?
    `);

    return statement.get(couponCode) || null;
  }
};
