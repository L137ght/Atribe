import { env } from "../config/env.js";
import { getSupabase } from "../db/supabase.js";
import { brandIntegrationRepository } from "../repositories/brand-integration-repository.js";
import { campaignRepository } from "../repositories/campaign-repository.js";
import { creatorBrandLinkRepository } from "../repositories/creator-brand-link-repository.js";
import { creatorRepository } from "../repositories/creator-repository.js";
import { linkRepository } from "../repositories/link-repository.js";
import { linkClickRepository } from "../repositories/link-click-repository.js";
import { orderAttributionRepository } from "../repositories/order-attribution-repository.js";
import { orderCommissionRepository } from "../repositories/order-commission-repository.js";
import { shopRepository } from "../repositories/shop-repository.js";
import { shopScriptTagRepository } from "../repositories/shop-script-tag-repository.js";
import { shopWebhookRegistrationRepository } from "../repositories/shop-webhook-registration-repository.js";

const requireId = (value, fieldName) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
};

const toNumber = (value) => Number(value || 0);
const toIsoDate = (date) => (date ? new Date(date).toISOString() : null);

export const dashboardService = {
  async getCreatorLinks(creatorId) {
    const normalizedCreatorId = requireId(creatorId, "creator_id");
    return linkRepository.findByCreatorId(normalizedCreatorId);
  },

  async getCreatorOrders(creatorId) {
    const normalizedCreatorId = requireId(creatorId, "creator_id");
    return orderCommissionRepository.findByCreatorId(normalizedCreatorId);
  },

  async getCreatorEarnings(creatorId) {
    const normalizedCreatorId = requireId(creatorId, "creator_id");
    const commissions = await orderCommissionRepository.findByCreatorId(normalizedCreatorId);

    const totals = commissions.reduce(
      (accumulator, commission) => {
        accumulator.creatorCommissionTotal += toNumber(commission.creatorCommission);
        accumulator.platformFeeTotal += toNumber(commission.platformFee);
        accumulator.ordersCount += 1;
        if (commission.status === "paid") {
          accumulator.paidTotal += toNumber(commission.creatorCommission);
        } else {
          accumulator.pendingTotal += toNumber(commission.creatorCommission);
        }
        return accumulator;
      },
      {
        creatorCommissionTotal: 0,
        platformFeeTotal: 0,
        ordersCount: 0,
        paidTotal: 0,
        pendingTotal: 0
      }
    );

    const byShop = new Map();
    for (const commission of commissions) {
      const key = commission.shopDomain || "unknown";
      const current = byShop.get(key) || {
        shop_domain: key,
        total_commission: 0,
        orders_count: 0
      };
      current.total_commission += toNumber(commission.creatorCommission);
      current.orders_count += 1;
      byShop.set(key, current);
    }

    return {
      creator_id: normalizedCreatorId,
      totals: {
        creator_commission: totals.creatorCommissionTotal.toFixed(2),
        platform_fee: totals.platformFeeTotal.toFixed(2),
        pending_commission: totals.pendingTotal.toFixed(2),
        paid_commission: totals.paidTotal.toFixed(2),
        orders_count: totals.ordersCount
      },
      by_shop: [...byShop.values()].map((item) => ({
        ...item,
        total_commission: item.total_commission.toFixed(2)
      })),
      commissions
    };
  },

  async getCreatorBrands(creatorId) {
    const normalizedCreatorId = requireId(creatorId, "creator_id");
    return creatorBrandLinkRepository.findByCreatorId(normalizedCreatorId);
  },

  async createCreatorBrandLink({ creatorId, shopDomain }) {
    const normalizedCreatorId = requireId(creatorId, "creator_id");
    const normalizedShopDomain = requireId(shopDomain, "shop_domain").toLowerCase();
    const creator = await creatorRepository.findById(normalizedCreatorId);

    if (!creator) {
      throw new Error("Creator not found.");
    }

    const integration = await brandIntegrationRepository.findByShopDomain(normalizedShopDomain);
    const hasActiveCampaign = integration
      ? await campaignRepository.hasActiveCampaign(normalizedShopDomain)
      : false;

    if (integration?.integrationStatus === "active" && !hasActiveCampaign) {
      throw new Error("This Shopify store is connected, but the brand has not launched a creator campaign yet.");
    }

    const status = integration?.integrationStatus === "active" ? "active" : "pending_install";

    return creatorBrandLinkRepository.upsert({
      creatorId: normalizedCreatorId,
      shopDomain: normalizedShopDomain,
      brandId: integration?.brandId || null,
      status,
      defaultCommissionRate: integration?.defaultCommissionRate ?? null
    });
  },

  async updateCreatorBrandLink({ id, status }) {
    const normalizedId = requireId(id, "id");
    const normalizedStatus = requireId(status, "status");
    const allowedStatuses = new Set(["pending_install", "active", "paused", "archived"]);

    if (!allowedStatuses.has(normalizedStatus)) {
      throw new Error("status must be one of pending_install, active, paused, archived.");
    }

    const existing = await creatorBrandLinkRepository.findById(normalizedId);
    if (!existing) {
      throw new Error("Creator brand link not found.");
    }

    return creatorBrandLinkRepository.upsert({
      id: normalizedId,
      brandId: existing.brandId,
      shopDomain: existing.shopDomain,
      creatorId: existing.creatorId,
      status: normalizedStatus,
      defaultCommissionRate: existing.defaultCommissionRate,
      couponCode: existing.couponCode
    });
  },

  async archiveCreatorBrandLink(id) {
    return this.updateCreatorBrandLink({
      id,
      status: "archived"
    });
  },

  async getBrandShopifyInstallStatus({ brandId, shopDomain }) {
    const normalizedShopDomain = String(shopDomain || "").trim() || null;
    const normalizedBrandId = String(brandId || "").trim() || null;

    let resolvedShopDomain = normalizedShopDomain;
    if (!resolvedShopDomain && env.dbProvider === "supabase" && normalizedBrandId) {
      const { data, error } = await getSupabase()
        .from("shopify_brand_integrations")
        .select("shop_domain")
        .eq("brand_id", normalizedBrandId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to load brand install status: ${error.message}`);
      }

      resolvedShopDomain = data?.shop_domain || null;
    }

    if (!resolvedShopDomain) {
      throw new Error("brand_id or shop_domain is required.");
    }

    const [shop, integration, activeCampaign] = await Promise.all([
      shopRepository.findByShopDomain(resolvedShopDomain),
      brandIntegrationRepository.findByShopDomain(resolvedShopDomain),
      campaignRepository.findLatestActiveByShopDomain(resolvedShopDomain)
    ]);
    const scriptTags = (await shopScriptTagRepository.findAll()).filter(
      (item) => item.shopDomain === resolvedShopDomain
    );
    const webhooks = (await shopWebhookRegistrationRepository.findAll()).filter(
      (item) => item.shopDomain === resolvedShopDomain
    );

    return {
      shop_domain: resolvedShopDomain,
      install_status: shop?.uninstalledAt ? "uninstalled" : shop ? "installed" : "not_installed",
      program_type: shop ? "atribe_shopify" : null,
      has_active_campaign: Boolean(activeCampaign),
      active_campaign: activeCampaign,
      default_commission_rate: integration?.defaultCommissionRate ?? null,
      script_tags: scriptTags,
      registered_webhooks: webhooks,
      app_url: env.shopifyAppUrl,
      atribe_base_url: env.atribeBaseUrl
    };
  },

  async createBrandCampaign({
    brandId = null,
    shopDomain,
    name,
    shopperOfferType = null,
    shopperOfferValue = null,
    commissionRate,
    duration
  }) {
    const normalizedShopDomain = requireId(shopDomain, "shop_domain").toLowerCase();
    const normalizedName = requireId(name, "name");
    const normalizedCommissionRate = Number(commissionRate);

    if (!Number.isFinite(normalizedCommissionRate) || normalizedCommissionRate <= 0 || normalizedCommissionRate > 1) {
      throw new Error("commission_rate must be a decimal between 0 and 1.");
    }

    const integration = await brandIntegrationRepository.findByShopDomain(normalizedShopDomain);
    if (!integration || integration.integrationStatus !== "active") {
      throw new Error("This Shopify store is not connected yet.");
    }

    const startsAt = new Date();
    let endsAt = null;
    if (duration === "7_days") {
      endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (duration === "30_days") {
      endsAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (duration !== "always_on") {
      throw new Error("duration must be one of always_on, 7_days, 30_days.");
    }

    const campaign = await campaignRepository.create({
      brandId: brandId || integration.brandId || null,
      shopDomain: normalizedShopDomain,
      name: normalizedName,
      shopperOfferType: shopperOfferType || null,
      shopperOfferValue: shopperOfferValue || null,
      commissionRate: normalizedCommissionRate,
      startsAt: toIsoDate(startsAt),
      endsAt: toIsoDate(endsAt),
      status: "active"
    });

    return {
      campaign_id: campaign.id,
      status: campaign.status,
      shop_domain: campaign.shopDomain,
      commission_rate: campaign.commissionRate
    };
  },

  async getBrandOrders({ brandId, shopDomain }) {
    if (!brandId && !shopDomain) {
      throw new Error("brand_id or shop_domain is required.");
    }

    return orderAttributionRepository.findByBrandFilter({
      brandId: brandId || null,
      shopDomain: shopDomain || null
    });
  },

  async getBrandCommissions({ brandId, shopDomain }) {
    if (!brandId && !shopDomain) {
      throw new Error("brand_id or shop_domain is required.");
    }

    return orderCommissionRepository.findByBrandFilter({
      brandId: brandId || null,
      shopDomain: shopDomain || null
    });
  },

  async getBrandCreators({ brandId, shopDomain }) {
    const creatorLinks =
      env.dbProvider === "supabase"
        ? await (async () => {
            let query = getSupabase()
              .from("shopify_creator_brand_links")
              .select("creator_id, brand_id, shop_domain, status, default_commission_rate, coupon_code, created_at, updated_at");

            if (brandId) {
              query = query.eq("brand_id", brandId);
            }
            if (shopDomain) {
              query = query.eq("shop_domain", shopDomain);
            }

            const { data, error } = await query.order("created_at", { ascending: false });
            if (error) {
              throw new Error(`Failed to load brand creators: ${error.message}`);
            }
            return data || [];
          })()
        : [];

    const commissions = await this.getBrandCommissions({ brandId, shopDomain });
    const creators = new Map();

    for (const link of creatorLinks) {
      creators.set(link.creator_id, {
        creator_id: link.creator_id,
        brand_id: link.brand_id,
        shop_domain: link.shop_domain,
        status: link.status,
        default_commission_rate: link.default_commission_rate,
        coupon_code: link.coupon_code,
        total_attributed_value: 0,
        total_commission: 0
      });
    }

    for (const commission of commissions) {
      const current = creators.get(commission.creatorId) || {
        creator_id: commission.creatorId,
        brand_id: brandId || null,
        shop_domain: shopDomain || commission.shopDomain || null,
        status: "active",
        default_commission_rate: commission.commissionRate || null,
        coupon_code: null,
        total_attributed_value: 0,
        total_commission: 0
      };
      current.total_attributed_value += toNumber(commission.orderValue);
      current.total_commission += toNumber(commission.creatorCommission);
      creators.set(commission.creatorId, current);
    }

    return [...creators.values()].map((item) => ({
      ...item,
      total_attributed_value: item.total_attributed_value.toFixed(2),
      total_commission: item.total_commission.toFixed(2)
    }));
  },

  async getBrandClicks({ brandId, shopDomain }) {
    if (!brandId && !shopDomain) {
      throw new Error("brand_id or shop_domain is required.");
    }

    return linkClickRepository.findByBrandFilter({
      brandId: brandId || null,
      shopDomain: shopDomain || null
    });
  }
};
