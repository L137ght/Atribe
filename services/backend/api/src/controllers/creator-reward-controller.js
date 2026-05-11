import {
  getRewardStatus,
  getPointsForAction,
} from "../../../../../packages/domain/src/index.js";
import { creatorRewardRepository } from "../../../shopify-app/src/repositories/creator-reward-repository.js";
import { rewardClaimRepository } from "../../../shopify-app/src/repositories/reward-claim-repository.js";
import { supportScoreRepository } from "../../../shopify-app/src/repositories/support-score-repository.js";
import { supportActionRepository } from "../../../shopify-app/src/repositories/support-action-repository.js";
import { creatorRepository } from "../../../shopify-app/src/repositories/creator-repository.js";
import { logger } from "../../../shopify-app/src/utils/logger.js";

const VALID_REWARD_TYPES = ["early_access", "shared_community", "private_ama"];
const VALID_DELIVERY_TYPES = ["external_url", "manual"];

function validateDestinationUrl(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error("destinationUrl must be a valid absolute URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("destinationUrl must use http or https.");
  }
  return parsed.toString();
}

export const creatorRewardController = {
  async listRewards(req, res) {
    try {
      const { creatorId } = req.params;
      const supporterId = req.auth?.userId;

      if (!creatorId) {
        return res.status(400).json({ error: "creatorId is required." });
      }

      const creator = await creatorRepository.findById(creatorId);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found." });
      }

      const isOwner = supporterId && creator.userId === supporterId;
      const rewards = await creatorRewardRepository.findByCreatorId(creatorId, isOwner);

      let supportScore = null;
      let claims = [];

      if (supporterId && !isOwner) {
        supportScore = await supportScoreRepository.findBySupporterAndCreator(supporterId, creatorId);
        claims = await rewardClaimRepository.findBySupporterAndCreator(supporterId, creatorId);
      }

      const enriched = rewards.map((reward) => {
        const claim = claims.find((c) => c.rewardId === reward.id);
        const status = getRewardStatus({ supportScore, reward, claim });

        const result = {
          id: reward.id,
          creatorId: reward.creatorId,
          title: reward.title,
          description: reward.description,
          rewardType: reward.rewardType,
          requiredPoints: reward.requiredPoints,
          deliveryType: reward.deliveryType,
          isActive: reward.isActive,
          isUnlocked: isOwner ? true : status.isUnlocked,
          isClaimed: status.isClaimed,
          pointsRemaining: isOwner ? 0 : status.pointsRemaining,
        };

        if (isOwner || (status.isUnlocked && status.isClaimed)) {
          result.destinationUrl = reward.destinationUrl;
        }

        return result;
      });

      return res.status(200).json(enriched);
    } catch (error) {
      logger.warn("Failed to list rewards", { error: error.message });
      return res.status(400).json({ error: error.message });
    }
  },

  async createReward(req, res) {
    try {
      const ownerUserId = req.auth?.userId;
      if (!ownerUserId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      const creator = await creatorRepository.findByUserId(ownerUserId);
      if (!creator || creator.userId !== ownerUserId) {
        return res.status(403).json({ error: "Only creators can create rewards for themselves." });
      }

      const {
        title,
        description,
        rewardType,
        requiredPoints,
        deliveryType,
        destinationUrl,
        isActive,
      } = req.body || {};

      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ error: "title is required." });
      }

      if (!rewardType || !VALID_REWARD_TYPES.includes(rewardType)) {
        return res.status(400).json({
          error: `rewardType must be one of: ${VALID_REWARD_TYPES.join(", ")}.`,
        });
      }

      if (deliveryType && !VALID_DELIVERY_TYPES.includes(deliveryType)) {
        return res.status(400).json({
          error: `deliveryType must be one of: ${VALID_DELIVERY_TYPES.join(", ")}.`,
        });
      }

      const points = Number(requiredPoints);
      if (isNaN(points) || points < 0) {
        return res.status(400).json({ error: "requiredPoints must be a non-negative number." });
      }

      const validatedUrl = destinationUrl ? validateDestinationUrl(destinationUrl) : null;

      const reward = await creatorRewardRepository.create({
        creatorId: creator.id,
        title: title.trim(),
        description: description || null,
        rewardType,
        requiredPoints: points,
        deliveryType: deliveryType || "external_url",
        destinationUrl: validatedUrl,
        isActive: isActive !== false,
      });

      logger.info("Created creator reward", { rewardId: reward.id, creatorId: creator.id, rewardType });

      return res.status(201).json({
        id: reward.id,
        creatorId: reward.creatorId,
        title: reward.title,
        description: reward.description,
        rewardType: reward.rewardType,
        requiredPoints: reward.requiredPoints,
        deliveryType: reward.deliveryType,
        destinationUrl: reward.destinationUrl,
        isActive: reward.isActive,
      });
    } catch (error) {
      logger.warn("Failed to create reward", { error: error.message });
      return res.status(400).json({ error: error.message });
    }
  },

  async claimReward(req, res) {
    try {
      const supporterId = req.auth?.userId;
      if (!supporterId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      const { rewardId } = req.params;

      const reward = await creatorRewardRepository.findById(rewardId);
      if (!reward) {
        return res.status(404).json({ error: "Reward not found." });
      }

      if (!reward.isActive) {
        return res.status(400).json({ error: "This reward is not currently active." });
      }

      const supportScore = await supportScoreRepository.findBySupporterAndCreator(
        supporterId,
        reward.creatorId
      );

      const existingClaim = await rewardClaimRepository.findByRewardAndSupporter(rewardId, supporterId);
      if (existingClaim) {
        const status = getRewardStatus({ supportScore, reward, claim: existingClaim });
        return res.status(200).json({
          claimed: true,
          destinationUrl: status.isUnlocked ? reward.destinationUrl : null,
        });
      }

      if (!supportScore || supportScore.lifetimePoints < reward.requiredPoints) {
        return res.status(400).json({
          error: "not_enough_points",
          requiredPoints: reward.requiredPoints,
          currentPoints: supportScore?.lifetimePoints ?? 0,
          pointsRemaining: supportScore
            ? reward.requiredPoints - supportScore.lifetimePoints
            : reward.requiredPoints,
        });
      }

      const claim = await rewardClaimRepository.claim({
        rewardId,
        supporterId,
        creatorId: reward.creatorId,
      });

      if (!claim) {
        return res.status(409).json({ error: "Reward already claimed." });
      }

      const points = getPointsForAction("reward_claimed");
      await supportActionRepository.create({
        supporterId,
        creatorId: reward.creatorId,
        actionType: "reward_claimed",
        points,
        rewardId,
        metadata: { rewardType: reward.rewardType, rewardTitle: reward.title },
      });

      logger.info("Reward claimed", { rewardId, supporterId, creatorId: reward.creatorId });

      return res.status(200).json({
        claimed: true,
        destinationUrl: reward.destinationUrl,
      });
    } catch (error) {
      logger.warn("Failed to claim reward", { error: error.message });
      return res.status(400).json({ error: error.message });
    }
  },
};
