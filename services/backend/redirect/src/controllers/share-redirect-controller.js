import { getPointsForAction } from "../../../../../packages/domain/src/index.js";
import { shareLinkRepository } from "../../../shopify-app/src/repositories/share-link-repository.js";
import { shareClickRepository } from "../../../shopify-app/src/repositories/share-click-repository.js";
import { supportActionRepository } from "../../../shopify-app/src/repositories/support-action-repository.js";
import { supportScoreRepository } from "../../../shopify-app/src/repositories/support-score-repository.js";
import { logger } from "../../../shopify-app/src/utils/logger.js";
import { getRequestFingerprint } from "../../../shopify-app/src/utils/request-fingerprint.js";

const DUPLICATE_WINDOW_MS = 86_400_000;

export const shareRedirectController = {
  async redirect(req, res) {
    try {
      const { shortCode } = req.params;

      if (!shortCode) {
        return res.status(404).json({ error: "Share link not found." });
      }

      const shareLink = await shareLinkRepository.findByShortCode(shortCode);

      if (!shareLink) {
        return res.status(404).json({ error: "Share link not found." });
      }

      const visitorUserId = req.auth?.userId || null;
      const referrer = req.get("referer") || null;
      const requestFingerprint = getRequestFingerprint(req);
      const { ipHash, userAgentHash, visitorFingerprintHash } = requestFingerprint;

      const isSelfClick = Boolean(
        (visitorUserId && visitorUserId === shareLink.supporterId) ||
        (
          shareLink.ownerFingerprintHash &&
          visitorFingerprintHash &&
          shareLink.ownerFingerprintHash === visitorFingerprintHash
        )
      );

      let isDuplicate = false;
      if (visitorFingerprintHash) {
        const recentClick = await shareClickRepository.findRecentByFingerprint(
          shareLink.id,
          visitorFingerprintHash,
          DUPLICATE_WINDOW_MS
        );
        isDuplicate = Boolean(recentClick);
      }

      const shouldAwardPoints = !isSelfClick && !isDuplicate;
      const points = shouldAwardPoints
        ? getPointsForAction("creator_content_share_clicked")
        : 0;

      await shareClickRepository.create({
        shareLinkId: shareLink.id,
        visitorUserId,
        visitorFingerprintHash,
        ipHash,
        userAgentHash,
        awardedPoints: points,
        wasSelfClick: isSelfClick,
        wasDuplicate: isDuplicate,
        referrer,
      });

      await shareLinkRepository.incrementClickCount(shareLink.id);

      if (shouldAwardPoints) {
        await supportActionRepository.create({
          supporterId: shareLink.supporterId,
          creatorId: shareLink.creatorId,
          actionType: "creator_content_share_clicked",
          points,
          sourceType: "share_link_click",
          sourceUrl: shareLink.originalUrl,
          shareLinkId: shareLink.id,
          metadata: {
            platform: shareLink.platform,
            visitorFingerprintHash,
          },
        });

        await supportScoreRepository.incrementPoints(
          shareLink.supporterId,
          shareLink.creatorId,
          points
        );
      }

      logger.info("Resolved share redirect", {
        shortCode,
        shareLinkId: shareLink.id,
        isSelfClick,
        isDuplicate,
        pointsAwarded: points,
      });

      return res.redirect(302, shareLink.originalUrl);
    } catch (error) {
      logger.error("Failed to process share redirect", {
        error: error.message,
        shortCode: req.params.shortCode,
      });
      return res.redirect(302, "https://atribe.io");
    }
  },
};
