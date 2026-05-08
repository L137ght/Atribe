/**
 * services/backend — Phase 1 compatibility composition layer.
 *
 * Composes api, redirect, and shopify-app into a single Express server
 * matching the current api.atribe.io route topology.
 *
 * Contains ZERO business/domain logic. Exists solely for Phase 1 single-deploy.
 * Phase 2: each service moves to its own Render service; this file is removed.
 */
import express from "express";
import { corsMiddleware } from "../shopify-app/src/middleware/cors.js";

import { createApiApp } from "../api/src/createApp.js";
import { createRedirectApp } from "../redirect/src/createApp.js";
import { createShopifyApp } from "../shopify-app/src/createShopifyApp.js";

export function createBackendApp() {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json());

  app.get("/health", (_req, res) =>
    res.status(200).json({ ok: true, service: "atribe-backend" })
  );

  // Mount modular service apps
  app.use(createApiApp());
  app.use(createRedirectApp());
  app.use(createShopifyApp());

  app.use((error, _req, res, _next) => {
    console.error("Unhandled server error", error);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}
