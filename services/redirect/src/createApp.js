/**
 * services/redirect — Link routing & redirect server.
 *
 * Owns:
 *   - Link creation (POST /links/create)
 *   - Supporter routing (GET /u/:user_id/route)
 *   - Legacy creator redirect (GET /r/:creator_id/:link_id)
 *
 * Does NOT require Shopify credentials.
 * Runs standalone or composed via services/backend.
 */
import express from "express";
import { corsMiddleware } from "@atribe/http";

import { linkRouter } from "./routes/link-routes.js";
import { redirectRouter } from "./routes/redirect-routes.js";

export function createRedirectApp() {
  const app = express();
  app.use(express.json());
  app.use(corsMiddleware);

  app.get("/health", (_req, res) => res.status(200).json({ ok: true, service: "redirect" }));

  app.use("/links", linkRouter);
  app.use("/", redirectRouter);

  return app;
}
