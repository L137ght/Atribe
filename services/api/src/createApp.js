/**
 * services/api — Business & Domain API server.
 *
 * Owns:
 *   - Dashboard routes (creator/brand reporting, brand campaigns)
 *   - Debug routes (non-production only)
 *   - Price history lookup
 *
 * Does NOT require Shopify credentials.
 * Runs standalone or composed via services/backend.
 */
import express from "express";
import { corsMiddleware } from "@atribe/http";

import { dashboardRouter } from "./routes/dashboard-routes.js";
import { debugRouter } from "./routes/debug-routes.js";
import { priceHistoryRouter } from "./routes/price-history-routes.js";

export function createApiApp() {
  const app = express();
  app.use(express.json());
  app.use(corsMiddleware);

  app.get("/health", (_req, res) => res.status(200).json({ ok: true, service: "api" }));

  app.use("/", dashboardRouter);
  if (process.env.NODE_ENV !== "production") {
    app.use("/debug", debugRouter);
  }
  app.use("/price-history", priceHistoryRouter);
  app.use("/api/price-history", priceHistoryRouter);

  return app;
}
