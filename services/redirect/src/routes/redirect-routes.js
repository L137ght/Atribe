import { Router } from "express";

import { linkController } from "../controllers/link-controller.js";
import { attachAuthContext, requireSelfUserRouteIfAuthenticated } from "@atribe/http";

export const redirectRouter = Router();

redirectRouter.get("/u/:user_id/route", attachAuthContext, requireSelfUserRouteIfAuthenticated, linkController.userRoute);
redirectRouter.get("/r/:creator_id/:link_id", linkController.redirect);
