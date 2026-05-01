import { Router } from "express";

import { linkController } from "../controllers/link-controller.js";

export const redirectRouter = Router();

redirectRouter.get("/u/:user_id/route", linkController.userRoute);
redirectRouter.get("/r/:creator_id/:link_id", linkController.redirect);
