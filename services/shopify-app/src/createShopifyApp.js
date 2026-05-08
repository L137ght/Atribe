/**
 * services/shopify-app — Shopify integration server.
 *
 * Owns:
 *   - Shopify OAuth install/auth
 *   - Webhook ingestion (orders, refunds, uninstall, GDPR)
 *   - Storefront attribution script delivery
 *
 * REQUIRES Shopify credentials (SHOPIFY_API_KEY, etc.).
 * Runs standalone or composed via services/backend.
 */
import express from "express";
import { authRouter } from "./routes/auth-routes.js";
import { shopifyDebugRouter } from "./routes/shopify-debug-routes.js";
import { storefrontRouter } from "./routes/storefront-routes.js";
import { webhookRouter } from "./routes/webhook-routes.js";
import { shopRepository } from "./repositories/shop-repository.js";
import { corsMiddleware, logger } from "@atribe/http";

const appEntryHandler = async (req, res) => {
  try {
    const shopDomain = String(req.query.shop || "").trim();
    const installedShop = shopDomain
      ? await shopRepository.findByShopDomain(shopDomain)
      : null;

    logger.info("Received Shopify app entry request", {
      path: req.path,
      shop: shopDomain || null,
      hasInstalledShop: Boolean(installedShop),
      embedded: String(req.query.embedded || "") || null
    });

    if (shopDomain && !installedShop) {
      return res.redirect(`/auth?shop=${encodeURIComponent(shopDomain)}`);
    }

    return res.status(200).json({
      ok: true,
      service: "shopify-app-backend",
      installed_shop: installedShop?.shopDomain || null,
      routes: {
        health: "/health",
        auth: "/auth?shop={shop}.myshopify.com",
        user_route: "/u/{user_id}/route?url={encoded_url}",
        storefront_script: "/storefront/atribe.js"
      }
    });
  } catch (error) {
    logger.error("Failed to handle Shopify app entry request", {
      error: error.message
    });
    return res.status(500).json({ error: "Failed to load app entry." });
  }
};

export function createShopifyApp() {
  const app = express();

  // Webhook routes need raw body before JSON parser
  app.use("/webhooks", webhookRouter);
  app.use(express.json());
  app.use(corsMiddleware);

  app.get("/health", (_req, res) =>
    res.status(200).json({ ok: true, service: "shopify-app" })
  );

  app.get("/", appEntryHandler);
  app.get("/app", appEntryHandler);

  app.use("/auth", authRouter);
  if (process.env.NODE_ENV !== "production") {
    app.use("/debug", shopifyDebugRouter);
  }
  app.use("/storefront", storefrontRouter);

  app.use((error, _req, res, _next) => {
    console.error("Unhandled server error", error);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}
