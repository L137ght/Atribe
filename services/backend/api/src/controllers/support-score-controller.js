import { supportScoreRepository } from "../../../shopify-app/src/repositories/support-score-repository.js";
import { creatorRewardRepository } from "../../../shopify-app/src/repositories/creator-reward-repository.js";
import { creatorRepository } from "../../../shopify-app/src/repositories/creator-repository.js";
import { logger } from "../../../shopify-app/src/utils/logger.js";

export const supportScoreController = {
  async getScores(req, res) {
    try {
      const supporterId = req.auth?.userId;
      if (!supporterId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      const scores = await supportScoreRepository.findBySupporter(supporterId);

      const enriched = await Promise.all(
        scores.map(async (score) => {
          const creator = await creatorRepository.findById(score.creatorId);
          const nextReward = await creatorRewardRepository.findNextReward(
            score.creatorId,
            score.lifetimePoints
          );

          return {
            creatorId: score.creatorId,
            creatorName: creator?.name || "Unknown Creator",
            lifetimePoints: score.lifetimePoints,
            monthlyPoints: score.monthlyPoints,
            nextReward: nextReward
              ? {
                  id: nextReward.id,
                  title: nextReward.title,
                  requiredPoints: nextReward.requiredPoints,
                  pointsRemaining: nextReward.pointsRemaining,
                }
              : null,
          };
        })
      );

      return res.status(200).json(enriched);
    } catch (error) {
      logger.warn("Failed to fetch support scores", { error: error.message });
      return res.status(400).json({ error: error.message });
    }
  },
};
