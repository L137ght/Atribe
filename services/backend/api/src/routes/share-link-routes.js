import { Router } from "express";
import { shareLinkController } from "../controllers/share-link-controller.js";
import {
  attachAuthContext,
  requireAuthenticatedUser,
} from "../../../shopify-app/src/middleware/auth-context.js";

export const shareLinkRouter = Router();

shareLinkRouter.use(attachAuthContext);
shareLinkRouter.post("/", requireAuthenticatedUser, shareLinkController.create);
