import crypto from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { fetchOne, upsertRow } from "./supabase/shared.js";

const now = () => new Date().toISOString();

const mapSupabaseIntegration = (row) =>
  row
    ? {
        id: row.id,
        brandId: row.brand_id,
        shopDomain: row.shop_domain,
        shopName: row.shop_name,
        integrationStatus: row.integration_status,
        defaultCommissionRate: row.default_commission_rate,
        installedAt: row.installed_at,
        uninstalledAt: row.uninstalled_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    : null;

export const brandIntegrationRepository = {
  async findByShopDomain(shopDomain) {
    if (env.dbProvider === "supabase") {
      return mapSupabaseIntegration(
        await fetchOne(
          "shopify_brand_integrations",
          "id, brand_id, shop_domain, shop_name, integration_status, default_commission_rate, installed_at, uninstalled_at, created_at, updated_at",
          { shop_domain: shopDomain }
        )
      );
    }

    const statement = db.prepare(`
      SELECT
        shop_domain AS shopDomain,
        brand_id AS brandId,
        shop_name AS shopName,
        integration_status AS integrationStatus,
        default_commission_rate AS defaultCommissionRate,
        installed_at AS installedAt,
        uninstalled_at AS uninstalledAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM brand_integrations
      WHERE shop_domain = ?
    `);

    return statement.get(shopDomain) || null;
  },

  async upsert({
    shopDomain,
    brandId = null,
    shopName = null,
    integrationStatus = "active",
    defaultCommissionRate = null,
    installedAt = null,
    uninstalledAt = null
  }) {
    const timestamp = now();

    if (env.dbProvider === "supabase") {
      const existing = await this.findByShopDomain(shopDomain);
      await upsertRow(
        "shopify_brand_integrations",
        {
          id: existing?.id || crypto.randomUUID(),
          brand_id: brandId ?? existing?.brandId ?? null,
          shop_domain: shopDomain,
          shop_name: shopName ?? existing?.shopName ?? null,
          integration_status: integrationStatus,
          default_commission_rate:
            defaultCommissionRate ?? existing?.defaultCommissionRate ?? null,
          installed_at: installedAt ?? existing?.installedAt ?? null,
          uninstalled_at: uninstalledAt ?? existing?.uninstalledAt ?? null,
          created_at: existing?.createdAt || timestamp,
          updated_at: timestamp
        },
        "shop_domain"
      );
      return this.findByShopDomain(shopDomain);
    }

    const statement = db.prepare(`
      INSERT INTO brand_integrations (
        shop_domain,
        brand_id,
        shop_name,
        integration_status,
        default_commission_rate,
        installed_at,
        uninstalled_at,
        created_at,
        updated_at
      )
      VALUES (
        @shopDomain,
        @brandId,
        @shopName,
        @integrationStatus,
        @defaultCommissionRate,
        @installedAt,
        @uninstalledAt,
        @createdAt,
        @updatedAt
      )
      ON CONFLICT(shop_domain) DO UPDATE SET
        brand_id = COALESCE(excluded.brand_id, brand_integrations.brand_id),
        shop_name = COALESCE(excluded.shop_name, brand_integrations.shop_name),
        integration_status = excluded.integration_status,
        default_commission_rate = COALESCE(excluded.default_commission_rate, brand_integrations.default_commission_rate),
        installed_at = COALESCE(excluded.installed_at, brand_integrations.installed_at),
        uninstalled_at = excluded.uninstalled_at,
        updated_at = excluded.updated_at
    `);

    statement.run({
      shopDomain,
      brandId,
      shopName,
      integrationStatus,
      defaultCommissionRate,
      installedAt,
      uninstalledAt,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    return this.findByShopDomain(shopDomain);
  }
};
