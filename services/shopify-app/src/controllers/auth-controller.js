import { shopRepository } from "../repositories/shop-repository.js";
import { oauthService } from "../services/oauth-service.js";
import { scriptTagService } from "../services/script-tag-service.js";
import { webhookService } from "../services/webhook-service.js";
import { logger } from "../utils/logger.js";

export const authController = {
  start(req, res) {
    try {
      const { installUrl } = oauthService.createInstallUrl(req.query.shop);
      logger.info("Starting Shopify OAuth install", {
        shop: req.query.shop || null
      });
      return res.redirect(installUrl);
    } catch (error) {
      logger.warn("Failed to start Shopify OAuth install", {
        error: error.message
      });
      return res.status(400).json({
        error: error.message
      });
    }
  },

  async callback(req, res) {
    try {
      const rawQueryString = req.originalUrl.split("?")[1] || "";
      const { shop, code } = oauthService.validateCallback({
        query: req.query,
        rawQueryString
      });
      const tokenResponse = await oauthService.exchangeCodeForAccessToken({ shop, code });

      shopRepository.upsert({
        shopDomain: shop,
        accessToken: tokenResponse.access_token,
        scope: tokenResponse.scope || null
      });

      const registeredWebhooks = await webhookService.registerAll({
        shop,
        accessToken: tokenResponse.access_token,
        scope: tokenResponse.scope
      });

      const registeredScriptTag = await scriptTagService.registerStorefrontScript({
        shop,
        accessToken: tokenResponse.access_token,
        scope: tokenResponse.scope
      });

      logger.info("Completed Shopify app install", {
        shop,
        webhookCount: registeredWebhooks.registered.length,
        skippedWebhookCount: registeredWebhooks.skipped.length,
        scriptTagId: registeredScriptTag.id
      });

      return res.status(200).json({
        message: "Shop installed successfully.",
        shop,
        registeredWebhooks: registeredWebhooks.registered,
        skippedWebhooks: registeredWebhooks.skipped,
        registeredScriptTag
      });
    } catch (error) {
      logger.error("Failed to complete Shopify OAuth callback", {
        error: error.message
      });
      return res.status(400).json({
        error: error.message
      });
    }
  }
};
