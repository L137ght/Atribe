import { Router } from "express";
import { shareRedirectController } from "../controllers/share-redirect-controller.js";
import { attachAuthContext } from "../../../shopify-app/src/middleware/auth-context.js";

export const shareRedirectRouter = Router();

shareRedirectRouter.use(attachAuthContext);
shareRedirectRouter.get("/s/:shortCode", shareRedirectController.redirect);
