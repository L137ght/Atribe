import { Router } from "express";
import { supportScoreController } from "../controllers/support-score-controller.js";
import {
  attachAuthContext,
  requireAuthenticatedUser,
} from "../../../shopify-app/src/middleware/auth-context.js";

export const supportScoreRouter = Router();

supportScoreRouter.use(attachAuthContext);
supportScoreRouter.get("/scores", requireAuthenticatedUser, supportScoreController.getScores);
