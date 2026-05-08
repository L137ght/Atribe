import crypto from "node:crypto";

import { env } from "../config/env.js";
import { clickWeightSnapshotRepository } from "../repositories/click-weight-snapshot-repository.js";
import { linkClickRepository } from "../repositories/link-click-repository.js";
import { orderAttributionRepository } from "../repositories/order-attribution-repository.js";
import { shopRepository } from "../repositories/shop-repository.js";
import { shopScriptTagRepository } from "../repositories/shop-script-tag-repository.js";
import { shopifyOrderRepository } from "../repositories/shopify-order-repository.js";
import { shopWebhookRegistrationRepository } from "../repositories/shop-webhook-registration-repository.js";
import { userCreatorWeightRepository } from "../repositories/user-creator-weight-repository.js";
import { linkRepository } from "../repositories/link-repository.js";

export const debugService = {
  async getShops() {
    return shopRepository.findAll();
  },

  async getLatestClicks() {
    return linkClickRepository.findByBrandFilter({ shopDomain: null, brandId: null, limit: 20 });
  },

  async getLatestLinks() {
    const links = await linkRepository.findLatest(20);
    return links.map((link) => ({
      ...link,
      trackingLink:
        link.trackingLink || `${env.atribeBaseUrl}/r/${encodeURIComponent(link.creatorId)}/${link.linkId}`
    }));
  },

  async getLatestOrders() {
    return shopifyOrderRepository.findLatest(20);
  },

  async getLatestAttributions() {
    return orderAttributionRepository.findLatest(20);
  },

  async getStorefrontScriptInfo() {
    const registeredScriptTags = await shopScriptTagRepository.findAll();
    return {
      script_url: `${env.shopifyAppUrl}/storefront/atribe.js`,
      expected_script_tag_src: `${env.shopifyAppUrl}/storefront/atribe.js`,
      expected_script_tag_registration_status:
        registeredScriptTags.length > 0 ? "registered_for_at_least_one_shop" : "not_registered_yet",
      registered_script_tags: registeredScriptTags,
      preferred_injection_method: "theme_app_extension_embed",
      theme_app_extension: {
        extension_directory: "extensions/atribe-theme-extension",
        embed_block_file: "blocks/atribe-app-embed.liquid",
        asset_file: "assets/atribe-app-embed.js",
        activation_path: "Theme editor -> App embeds -> Atribe Attribution"
      },
      reads_url_params: [
        "atribe_ref",
        "atribe_click",
        "atribe_user",
        "atribe_snapshot",
        "atribe_creator"
      ],
      stores_local_storage_keys: [
        "atribe_ref",
        "atribe_click",
        "atribe_user",
        "atribe_snapshot",
        "atribe_creator",
        "atribe_timestamp"
      ],
      syncs_cart_attributes: [
        "atribe_ref",
        "atribe_click",
        "atribe_user",
        "atribe_snapshot",
        "atribe_creator",
        "atribe_ts"
      ],
      relies_on_http_only_cookie_for_frontend: false
    };
  },

  async getShopifyInstallStatus() {
    return {
      installed_shops: await this.getShops(),
      registered_webhooks: await shopWebhookRegistrationRepository.findAll(),
      registered_script_tags: await shopScriptTagRepository.findAll(),
      current_app_url: env.shopifyAppUrl,
      current_atribe_base_url: env.atribeBaseUrl,
      current_callback_url: env.shopifyCallbackUrl || `${env.shopifyAppUrl}/auth/callback`
    };
  },

  async getUserCreatorWeights(userId) {
    return userCreatorWeightRepository.findActiveByUserId(userId);
  },

  async getLatestUserRouteClicks() {
    return linkClickRepository.findLatestUserRouteClicks(20);
  },

  async getUserValueDistribution(userId) {
    const weights = await this.getUserCreatorWeights(userId);
    const totalAttributedValue = weights.reduce(
      (sum, item) => sum + Number(item.attributedValueTotal || 0),
      0
    );
    const totalWeight = weights.reduce((sum, item) => sum + Number(item.weight || 0), 0);

    return weights.map((item) => ({
      creatorId: item.creatorId,
      weight: Number(item.weight || 0),
      targetShare: totalWeight > 0 ? Number(item.weight || 0) / totalWeight : 0,
      actualShare:
        totalAttributedValue > 0
          ? Number(item.attributedValueTotal || 0) / totalAttributedValue
          : 0,
      attributedValueTotal: Number(item.attributedValueTotal || 0),
      commissionValueTotal: Number(item.commissionValueTotal || 0),
      eventCount: Number(item.eventCount || 0),
      updatedAt: item.updatedAt
    }));
  },

  async getSnapshot(snapshotId) {
    return clickWeightSnapshotRepository.findById(snapshotId);
  },

  async seedUserWeights({ userId, weights }) {
    const normalizedUserId = String(userId || "").trim();
    if (!normalizedUserId) {
      throw new Error("user_id is required.");
    }

    if (!Array.isArray(weights) || weights.length === 0) {
      throw new Error("weights must be a non-empty array.");
    }

    for (const weight of weights) {
      const creatorId = String(weight?.creator_id || "").trim();
      const numericWeight = Number(weight?.weight || 0);

      if (!creatorId) {
        throw new Error("Each weight entry requires creator_id.");
      }

      if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
        throw new Error("Each weight entry requires a positive numeric weight.");
      }

      await userCreatorWeightRepository.upsert({
        id: crypto.randomUUID(),
        userId: normalizedUserId,
        creatorId,
        weight: numericWeight,
        active: true
      });
    }

    return this.getUserCreatorWeights(normalizedUserId);
  }
};
