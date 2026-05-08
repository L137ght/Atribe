import express from "express";

import { authRouter } from "./routes/auth-routes.js";
import { dashboardRouter } from "./routes/dashboard-routes.js";
import { debugRouter } from "./routes/debug-routes.js";
import { linkRouter } from "./routes/link-routes.js";
import { priceHistoryRouter } from "./routes/price-history-routes.js";
import { redirectRouter } from "./routes/redirect-routes.js";
import { storefrontRouter } from "./routes/storefront-routes.js";
import { webhookRouter } from "./routes/webhook-routes.js";
import { corsMiddleware } from "./middleware/cors.js";
import { shopRepository } from "./repositories/shop-repository.js";
import { logger } from "./utils/logger.js";

const appEntryHandler = async (req, res) => {
  try {
    const shopDomain = String(req.query.shop || "").trim();
    const installedShop = shopDomain ? await shopRepository.findByShopDomain(shopDomain) : null;

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
        create_link: "/links/create",
        user_route: "/u/{user_id}/route?url={encoded_url}",
        storefront_script: "/storefront/atribe.js"
      }
    });
  } catch (error) {
    logger.error("Failed to handle Shopify app entry request", {
      error: error.message
    });
    return res.status(500).json({
      error: "Failed to load app entry."
    });
  }
};

export const createApp = () => {
  const app = express();

  // Webhook routes must see the untouched raw body for HMAC verification.
  app.use("/webhooks", webhookRouter);
  app.use(express.json());
  app.use(corsMiddleware);

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get("/", appEntryHandler);
  app.get("/app", appEntryHandler);

  app.use("/auth", authRouter);
  app.use("/", dashboardRouter);
  if (process.env.NODE_ENV !== "production") {
    app.use("/debug", debugRouter);
  }
  app.use("/links", linkRouter);
  app.use("/price-history", priceHistoryRouter);
  app.use("/api/price-history", priceHistoryRouter);
  app.use("/storefront", storefrontRouter);
  app.use("/", redirectRouter);

  app.use((error, _req, res, _next) => {
    console.error("Unhandled server error", error);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
};
