import { Router } from "express";

import { linkController } from "../controllers/link-controller.js";
import { attachAuthContext, requireSelfUserRouteIfAuthenticated } from "../middleware/auth-context.js";

export const redirectRouter = Router();

redirectRouter.get("/u/:user_id/route", attachAuthContext, requireSelfUserRouteIfAuthenticated, linkController.userRoute);
redirectRouter.get("/r/:creator_id/:link_id", linkController.redirect);
