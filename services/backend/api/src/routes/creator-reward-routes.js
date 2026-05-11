import { Router } from "express";
import { creatorRewardController } from "../controllers/creator-reward-controller.js";
import {
  attachAuthContext,
  requireAuthenticatedUser,
} from "../../../shopify-app/src/middleware/auth-context.js";

export const creatorRewardRouter = Router();

creatorRewardRouter.use(attachAuthContext);

creatorRewardRouter.get(
  "/creators/:creatorId/rewards",
  creatorRewardController.listRewards
);

creatorRewardRouter.post(
  "/creator/rewards",
  requireAuthenticatedUser,
  creatorRewardController.createReward
);

creatorRewardRouter.post(
  "/rewards/:rewardId/claim",
  requireAuthenticatedUser,
  creatorRewardController.claimReward
);
