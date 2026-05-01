import { linkService } from "../services/link-service.js";
import { logger } from "../utils/logger.js";

const buildCookie = ({ name, value, maxAgeSeconds = 60 * 60 * 24 * 30 }) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;

const getClientIp = (req) => {
  const forwardedFor = req.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "";
};

export const linkController = {
  create(req, res) {
    try {
      const link = linkService.createLink({
        creatorId: req.body.creator_id,
        brandId: req.body.brand_id,
        destinationUrl: req.body.destination_url
      });

      logger.info("Created tracking link", {
        creatorId: link.creatorId,
        brandId: link.brandId,
        linkId: link.linkId
      });

      return res.status(201).json({
        link_id: link.linkId,
        creator_id: link.creatorId,
        brand_id: link.brandId,
        destination_url: link.destinationUrl,
        tracking_link: link.trackingLink,
        coupon_code: link.couponCode
      });
    } catch (error) {
      logger.warn("Failed to create tracking link", {
        error: error.message
      });
      return res.status(400).json({
        error: error.message
      });
    }
  },

  userRoute(req, res) {
    try {
      const result = linkService.createUserRoute({
        userId: req.params.user_id,
        destinationUrl: req.query.url,
        ipAddress: getClientIp(req),
        userAgent: req.get("user-agent")
      });

      logger.info("Resolved user routing redirect", {
        userId: result.userId,
        clickId: result.clickId,
        snapshotId: result.snapshotId,
        platformType: result.platformType,
        selectedCreatorId: result.selectedCreatorId,
        redirectUrl: result.redirectUrl
      });

      return res.redirect(302, result.redirectUrl);
    } catch (error) {
      logger.warn("Failed to process user routing redirect", {
        error: error.message,
        userId: req.params.user_id || null
      });
      return res.status(400).json({
        error: error.message
      });
    }
  },

  redirect(req, res) {
    try {
      const result = linkService.resolveLink({
        creatorId: req.params.creator_id,
        linkId: req.params.link_id,
        ipAddress: getClientIp(req),
        userAgent: req.get("user-agent")
      });

      if (!result) {
        logger.warn("Tracking link not found", {
          creatorId: req.params.creator_id,
          linkId: req.params.link_id
        });
        return res.status(404).json({ error: "Tracking link not found." });
      }

      logger.info("Resolved tracking redirect", {
        creatorId: result.creatorId,
        linkId: result.linkId,
        clickId: result.clickId,
        redirectUrl: result.redirectUrl
      });

      res.setHeader("Set-Cookie", [
        buildCookie({
          name: "atribe_ref",
          value: result.creatorId
        }),
        buildCookie({
          name: "atribe_click",
          value: result.clickId
        })
      ]);

      return res.redirect(302, result.redirectUrl);
    } catch (error) {
      logger.error("Failed to process tracking redirect", {
        error: error.message
      });
      return res.status(400).json({
        error: error.message
      });
    }
  }
};
