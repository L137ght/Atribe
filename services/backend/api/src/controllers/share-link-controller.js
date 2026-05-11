import crypto from "node:crypto";

import {
  classifyUrl,
  generateShortCode,
  getPointsForAction,
} from "../../../../../packages/domain/src/index.js";
import { env } from "../../../shopify-app/src/config/env.js";
import { creatorRepository } from "../../../shopify-app/src/repositories/creator-repository.js";
import { shareLinkRepository } from "../../../shopify-app/src/repositories/share-link-repository.js";
import { supportActionRepository } from "../../../shopify-app/src/repositories/support-action-repository.js";
import { supportScoreRepository } from "../../../shopify-app/src/repositories/support-score-repository.js";
import { logger } from "../../../shopify-app/src/utils/logger.js";
import { getRequestFingerprint } from "../../../shopify-app/src/utils/request-fingerprint.js";

function validateUrl(url) {
  if (!url || typeof url !== "string") {
    throw new Error("originalUrl is required.");
  }

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error("originalUrl must be a valid absolute URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("originalUrl must use http or https.");
  }

  return parsed.toString();
}

function getRedirectBaseUrl() {
  const base = String(env.atribeRedirectBaseUrl || env.atribeBaseUrl || "").trim();
  if (!base) {
    return "https://go.atribe.io";
  }
  return base;
}

export const shareLinkController = {
  async create(req, res) {
    try {
      const supporterId = req.auth?.userId;
      if (!supporterId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      const { creatorId, originalUrl } = req.body || {};

      if (!creatorId || typeof creatorId !== "string" || !creatorId.trim()) {
        return res.status(400).json({ error: "creatorId is required." });
      }

      const validatedUrl = validateUrl(originalUrl);
      const classification = classifyUrl(validatedUrl);
      const normalizedCreatorId = creatorId.trim();

      const creator = await creatorRepository.findById(normalizedCreatorId);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found." });
      }

      if (classification.category !== "creator_content") {
        return res.status(400).json({
          error: "Only YouTube, Instagram, and X/Twitter links are supported for share links.",
        });
      }

      const requestFingerprint = getRequestFingerprint(req);

      const linkId = crypto.randomUUID();
      let link = null;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const shortCode = generateShortCode();
        const existingLink = await shareLinkRepository.findByShortCode(shortCode);
        if (existingLink) {
          continue;
        }

        link = await shareLinkRepository.create({
          id: linkId,
          shortCode,
          supporterId,
          creatorId: normalizedCreatorId,
          originalUrl: validatedUrl,
          normalizedUrl: classification.normalizedUrl,
          platform: classification.platform,
          title: null,
          contentType: classification.contentType,
          ownerIpHash: requestFingerprint.ipHash,
          ownerUserAgentHash: requestFingerprint.userAgentHash,
          ownerFingerprintHash: requestFingerprint.visitorFingerprintHash,
        });

        break;
      }

      if (!link) {
        throw new Error("Unable to generate a unique share link. Try again.");
      }

      const points = getPointsForAction("creator_content_share_created");

      await supportActionRepository.create({
        supporterId,
        creatorId: normalizedCreatorId,
        actionType: "creator_content_share_created",
        points,
        sourceType: "share_link",
        sourceUrl: validatedUrl,
        shareLinkId: linkId,
        metadata: { platform: classification.platform, contentType: classification.contentType },
      });

      await supportScoreRepository.incrementPoints(supporterId, normalizedCreatorId, points);

      const redirectBaseUrl = getRedirectBaseUrl();

      logger.info("Created share link", {
        shareLinkId: linkId,
        shortCode: link.shortCode,
        supporterId,
        creatorId: normalizedCreatorId,
        platform: classification.platform,
      });

      return res.status(201).json({
        shareLinkId: link.id,
        shortCode: link.shortCode,
        shareUrl: `${redirectBaseUrl}/s/${link.shortCode}`,
        pointsAwarded: points,
      });
    } catch (error) {
      logger.warn("Failed to create share link", { error: error.message });
      return res.status(400).json({ error: error.message });
    }
  },
};
