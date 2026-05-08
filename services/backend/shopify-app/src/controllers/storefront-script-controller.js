import { storefrontScriptService } from "../services/storefront-script-service.js";
import { logger } from "../utils/logger.js";

export const storefrontScriptController = {
  serve(req, res) {
    logger.info("Served storefront attribution script", {
      userAgent: req.get("user-agent") || null,
      referer: req.get("referer") || null,
      query: req.query || {}
    });

    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).send(storefrontScriptService.getScript());
  }
};
