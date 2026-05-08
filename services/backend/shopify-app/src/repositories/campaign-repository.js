import crypto from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchMany, fetchOne, insertRow } from "./supabase/shared.js";

const nowIso = () => new Date().toISOString();

const mapSupabaseCampaign = (row) =>
  row
    ? {
        id: row.id,
        brandId: row.brand_id,
        shopDomain: row.shop_domain,
        name: row.name,
        shopperOfferType: row.shopper_offer_type,
        shopperOfferValue: row.shopper_offer_value,
        commissionRate: row.commission_rate,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    : null;

const mapSqliteCampaign = (row) =>
  row
    ? {
        id: row.id,
        brandId: row.brandId,
        shopDomain: row.shopDomain,
        name: row.name,
        shopperOfferType: row.shopperOfferType,
        shopperOfferValue: row.shopperOfferValue,
        commissionRate: row.commissionRate,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }
    : null;

const isCampaignActiveAt = (campaign, atTime = nowIso()) => {
  if (!campaign || campaign.status !== "active") {
    return false;
  }

  const evaluationTime = new Date(atTime).getTime();
  const startsAt = campaign.startsAt ? new Date(campaign.startsAt).getTime() : null;
  const endsAt = campaign.endsAt ? new Date(campaign.endsAt).getTime() : null;

  if (startsAt && startsAt > evaluationTime) {
    return false;
  }

  if (endsAt && endsAt <= evaluationTime) {
    return false;
  }

  return true;
};

export const campaignRepository = {
  async create({
    id = crypto.randomUUID(),
    brandId = null,
    shopDomain,
    name,
    shopperOfferType = null,
    shopperOfferValue = null,
    commissionRate,
    startsAt = null,
    endsAt = null,
    status = "active"
  }) {
    const timestamp = nowIso();

    if (env.dbProvider === "supabase") {
      await insertRow("shopify_campaigns", {
        id,
        brand_id: brandId,
        shop_domain: shopDomain,
        name,
        shopper_offer_type: shopperOfferType,
        shopper_offer_value: shopperOfferValue,
        commission_rate: commissionRate,
        starts_at: startsAt,
        ends_at: endsAt,
        status,
        created_at: timestamp,
        updated_at: timestamp
      });

      return this.findById(id);
    }

    const statement = db.prepare(`
      INSERT INTO shopify_campaigns (
        id,
        brand_id,
        shop_domain,
        name,
        shopper_offer_type,
        shopper_offer_value,
        commission_rate,
        starts_at,
        ends_at,
        status,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @brandId,
        @shopDomain,
        @name,
        @shopperOfferType,
        @shopperOfferValue,
        @commissionRate,
        @startsAt,
        @endsAt,
        @status,
        @createdAt,
        @updatedAt
      )
    `);

    statement.run({
      id,
      brandId,
      shopDomain,
      name,
      shopperOfferType,
      shopperOfferValue,
      commissionRate,
      startsAt,
      endsAt,
      status,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    return this.findById(id);
  },

  async findById(id) {
    if (env.dbProvider === "supabase") {
      return mapSupabaseCampaign(
        await fetchOne(
          "shopify_campaigns",
          "id, brand_id, shop_domain, name, shopper_offer_type, shopper_offer_value, commission_rate, starts_at, ends_at, status, created_at, updated_at",
          { id }
        )
      );
    }

    const statement = db.prepare(`
      SELECT
        id,
        brand_id AS brandId,
        shop_domain AS shopDomain,
        name,
        shopper_offer_type AS shopperOfferType,
        shopper_offer_value AS shopperOfferValue,
        commission_rate AS commissionRate,
        starts_at AS startsAt,
        ends_at AS endsAt,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM shopify_campaigns
      WHERE id = ?
    `);

    return mapSqliteCampaign(statement.get(id) || null);
  },

  async findByShopDomain(shopDomain, limit = 50) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "shopify_campaigns",
        columns:
          "id, brand_id, shop_domain, name, shopper_offer_type, shopper_offer_value, commission_rate, starts_at, ends_at, status, created_at, updated_at",
        filters: {
          shop_domain: shopDomain
        },
        orderBy: "created_at",
        ascending: false,
        limit
      });

      return rows.map(mapSupabaseCampaign);
    }

    const statement = db.prepare(`
      SELECT
        id,
        brand_id AS brandId,
        shop_domain AS shopDomain,
        name,
        shopper_offer_type AS shopperOfferType,
        shopper_offer_value AS shopperOfferValue,
        commission_rate AS commissionRate,
        starts_at AS startsAt,
        ends_at AS endsAt,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM shopify_campaigns
      WHERE shop_domain = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return statement.all(shopDomain, limit).map(mapSqliteCampaign);
  },

  async findActiveByShopDomain(shopDomain, atTime = nowIso()) {
    if (env.dbProvider === "supabase") {
      const { data, error } = await getSupabase()
        .from("shopify_campaigns")
        .select(
          "id, brand_id, shop_domain, name, shopper_offer_type, shopper_offer_value, commission_rate, starts_at, ends_at, status, created_at, updated_at"
        )
        .eq("shop_domain", shopDomain)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        throw new Error(`Supabase read failed for shopify_campaigns: ${error.message}`);
      }

      return (data || []).map(mapSupabaseCampaign).filter((campaign) => isCampaignActiveAt(campaign, atTime));
    }

    const statement = db.prepare(`
      SELECT
        id,
        brand_id AS brandId,
        shop_domain AS shopDomain,
        name,
        shopper_offer_type AS shopperOfferType,
        shopper_offer_value AS shopperOfferValue,
        commission_rate AS commissionRate,
        starts_at AS startsAt,
        ends_at AS endsAt,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM shopify_campaigns
      WHERE shop_domain = ? AND status = 'active'
      ORDER BY created_at DESC
    `);

    return statement
      .all(shopDomain)
      .map(mapSqliteCampaign)
      .filter((campaign) => isCampaignActiveAt(campaign, atTime));
  },

  async findLatestActiveByShopDomain(shopDomain, atTime = nowIso()) {
    return (await this.findActiveByShopDomain(shopDomain, atTime))[0] || null;
  },

  async hasActiveCampaign(shopDomain, atTime = nowIso()) {
    return Boolean(await this.findLatestActiveByShopDomain(shopDomain, atTime));
  }
};
