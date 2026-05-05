import { orderAttributionService } from "../services/order-attribution-service.js";
import { commissionService } from "../services/commission-service.js";
import { shopRepository } from "../repositories/shop-repository.js";
import { logger } from "../utils/logger.js";

const parseWebhookPayload = (rawBody) => {
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error("Invalid webhook payload JSON.");
  }
};

const withWebhookHandling = async (res, logContext, handler) => {
  try {
    await handler();
    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error("Failed to process Shopify webhook", {
      ...logContext,
      error: error.message
    });
    return res.status(400).json({
      error: error.message
    });
  }
};

export const webhookController = {
  async ordersCreate(req, res) {
    return withWebhookHandling(
      res,
      { topic: req.get("x-shopify-topic"), shop: req.get("x-shopify-shop-domain") || "" },
      async () => {
        const shopDomain = req.get("x-shopify-shop-domain") || "";
        const orderPayload = parseWebhookPayload(req.rawBody);
        const attribution = await orderAttributionService.processOrderWebhook({
          shopDomain,
          orderPayload
        });

        logger.info("Received orders/create webhook", {
          shop: shopDomain,
          topic: req.get("x-shopify-topic"),
          orderId: String(orderPayload?.id || "") || null,
          totalPrice: String(orderPayload?.total_price || "") || null,
          attributionSource: attribution?.attributionSource || null,
          creatorId: attribution?.creatorId || null,
          duplicate: attribution?.duplicate || false
        });
      }
    );
  },

  async ordersPaid(req, res) {
    return withWebhookHandling(
      res,
      { topic: req.get("x-shopify-topic"), shop: req.get("x-shopify-shop-domain") || "" },
      async () => {
        const shopDomain = req.get("x-shopify-shop-domain") || "";
        const orderPayload = parseWebhookPayload(req.rawBody);
        const attribution = await orderAttributionService.processOrderWebhook({
          shopDomain,
          orderPayload
        });

        logger.info("Received orders/paid webhook", {
          shop: shopDomain,
          topic: req.get("x-shopify-topic"),
          orderId: String(orderPayload?.id || "") || null,
          totalPrice: String(orderPayload?.total_price || "") || null,
          attributionSource: attribution?.attributionSource || null,
          creatorId: attribution?.creatorId || null,
          duplicate: attribution?.duplicate || false
        });
      }
    );
  },

  async ordersCancelled(req, res) {
    return withWebhookHandling(
      res,
      { topic: req.get("x-shopify-topic"), shop: req.get("x-shopify-shop-domain") || "" },
      async () => {
        const shopDomain = req.get("x-shopify-shop-domain") || "";
        const orderPayload = parseWebhookPayload(req.rawBody);
        const orderId = String(orderPayload?.id || "").trim();
        const commission = await commissionService.createCancelledOrderCommission({
          orderId,
          shopDomain
        });

        logger.info("Received orders/cancelled webhook", {
          shop: shopDomain,
          topic: req.get("x-shopify-topic"),
          orderId: orderId || null,
          creatorId: commission?.creatorId || null,
          eventType: commission?.eventType || null,
          duplicate: commission?.duplicate || false
        });
      }
    );
  },

  async refundsCreate(req, res) {
    return withWebhookHandling(
      res,
      { topic: req.get("x-shopify-topic"), shop: req.get("x-shopify-shop-domain") || "" },
      async () => {
        const shopDomain = req.get("x-shopify-shop-domain") || "";
        const refundPayload = parseWebhookPayload(req.rawBody);
        const commission = await commissionService.createRefundCommission({
          shopDomain,
          refundPayload
        });

        logger.info("Received refunds/create webhook", {
          shop: shopDomain,
          topic: req.get("x-shopify-topic"),
          orderId: String(refundPayload?.order_id || "") || null,
          refundId: String(refundPayload?.id || "") || null,
          creatorId: commission?.creatorId || null,
          eventType: commission?.eventType || null,
          duplicate: commission?.duplicate || false
        });
      }
    );
  },

  async appUninstalled(req, res) {
    return withWebhookHandling(
      res,
      { topic: req.get("x-shopify-topic"), shop: req.get("x-shopify-shop-domain") || "" },
      async () => {
        const shopDomain = req.get("x-shopify-shop-domain") || "";
        const payload = parseWebhookPayload(req.rawBody);

        if (shopDomain) {
          try {
            await shopRepository.deleteByShopDomain(shopDomain);
          } catch (error) {
            logger.error("Failed to clean up app uninstall data", {
              shop: shopDomain,
              topic: req.get("x-shopify-topic"),
              error: error.message
            });
          }
        }

        logger.info("Received app/uninstalled webhook", {
          shop: shopDomain || payload?.domain || null,
          topic: req.get("x-shopify-topic")
        });
      }
    );
  },

  customersDataRequest(req, res) {
    const shopDomain = req.get("x-shopify-shop-domain") || "";
    const payload = parseWebhookPayload(req.rawBody);

    logger.info("Received customers/data_request webhook", {
      shop: shopDomain,
      topic: req.get("x-shopify-topic"),
      customerId: String(payload?.customer?.id || payload?.customer?.customer_id || "") || null
    });

    return res.status(200).json({ ok: true });
  },

  customersRedact(req, res) {
    const shopDomain = req.get("x-shopify-shop-domain") || "";
    const payload = parseWebhookPayload(req.rawBody);

    logger.info("Received customers/redact webhook", {
      shop: shopDomain,
      topic: req.get("x-shopify-topic"),
      customerId: String(payload?.customer?.id || payload?.customer?.customer_id || "") || null
    });

    return res.status(200).json({ ok: true });
  },

  shopRedact(req, res) {
    const shopDomain = req.get("x-shopify-shop-domain") || "";
    const payload = parseWebhookPayload(req.rawBody);

    logger.info("Received shop/redact webhook", {
      shop: shopDomain || payload?.shop_domain || null,
      topic: req.get("x-shopify-topic")
    });

    return res.status(200).json({ ok: true });
  }
};
