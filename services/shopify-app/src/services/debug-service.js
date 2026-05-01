import { db } from "../db/database.js";
import { env } from "../config/env.js";
import { shopScriptTagRepository } from "../repositories/shop-script-tag-repository.js";
import { shopWebhookRegistrationRepository } from "../repositories/shop-webhook-registration-repository.js";

export const debugService = {
  getShops() {
    const statement = db.prepare(`
      SELECT
        shop_domain AS shopDomain,
        scope,
        installed_at AS installedAt
      FROM shops
      ORDER BY installed_at DESC
    `);

    return statement.all();
  },

  getLatestClicks() {
    const statement = db.prepare(`
      SELECT
        click_id AS clickId,
        link_id AS linkId,
        creator_id AS creatorId,
        selected_creator_id AS selectedCreatorId,
        user_id AS userId,
        destination_url AS destinationUrl,
        platform_type AS platformType,
        brand_id AS brandId,
        shop_domain AS shopDomain,
        snapshot_id AS snapshotId,
        clicked_at AS clickedAt,
        ip_hash AS ipHash,
        user_agent AS userAgent
      FROM link_clicks
      ORDER BY clicked_at DESC
      LIMIT 20
    `);

    return statement.all();
  },

  getLatestLinks() {
    const statement = db.prepare(`
      SELECT
        link_id AS linkId,
        creator_id AS creatorId,
        brand_id AS brandId,
        destination_url AS destinationUrl,
        created_at AS createdAt
      FROM links
      ORDER BY created_at DESC
      LIMIT 20
    `);

    return statement.all().map((link) => ({
      ...link,
      trackingLink: `${env.atribeBaseUrl}/r/${encodeURIComponent(link.creatorId)}/${link.linkId}`
    }));
  },

  getLatestOrders() {
    const statement = db.prepare(`
      SELECT
        order_id AS orderId,
        shop_domain AS shopDomain,
        total_price AS totalPrice,
        currency,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM shopify_orders
      ORDER BY updated_at DESC
      LIMIT 20
    `);

    return statement.all();
  },

  getLatestAttributions() {
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
      ORDER BY processed_at DESC
      LIMIT 20
    `);

    return statement.all();
  },

  getStorefrontScriptInfo() {
    return {
      script_url: `${env.shopifyAppUrl}/storefront/atribe.js`,
      expected_script_tag_src: `${env.shopifyAppUrl}/storefront/atribe.js`,
      expected_script_tag_registration_status:
        shopScriptTagRepository.findAll().length > 0 ? "registered_for_at_least_one_shop" : "not_registered_yet",
      registered_script_tags: shopScriptTagRepository.findAll(),
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

  getShopifyInstallStatus() {
    return {
      installed_shops: this.getShops(),
      registered_webhooks: shopWebhookRegistrationRepository.findAll(),
      registered_script_tags: shopScriptTagRepository.findAll(),
      current_app_url: env.shopifyAppUrl,
      current_atribe_base_url: env.atribeBaseUrl,
      current_callback_url: env.shopifyCallbackUrl || `${env.shopifyAppUrl}/auth/callback`
    };
  },

  getUserCreatorWeights(userId) {
    const statement = db.prepare(`
      SELECT
        id,
        user_id AS userId,
        creator_id AS creatorId,
        weight,
        active,
        attributed_value_total AS attributedValueTotal,
        commission_value_total AS commissionValueTotal,
        event_count AS eventCount,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM user_creator_weights
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `);

    return statement.all(userId);
  },

  getLatestUserRouteClicks() {
    const statement = db.prepare(`
      SELECT
        click_id AS clickId,
        user_id AS userId,
        selected_creator_id AS selectedCreatorId,
        destination_url AS destinationUrl,
        platform_type AS platformType,
        brand_id AS brandId,
        shop_domain AS shopDomain,
        snapshot_id AS snapshotId,
        clicked_at AS clickedAt
      FROM link_clicks
      WHERE user_id IS NOT NULL
      ORDER BY clicked_at DESC
      LIMIT 20
    `);

    return statement.all();
  },

  getUserValueDistribution(userId) {
    const weights = this.getUserCreatorWeights(userId);
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

  getSnapshot(snapshotId) {
    const statement = db.prepare(`
      SELECT
        id,
        click_id AS clickId,
        user_id AS userId,
        snapshot_json AS snapshotJson,
        created_at AS createdAt
      FROM click_weight_snapshots
      WHERE id = ?
    `);

    return statement.get(snapshotId) || null;
  }
};
