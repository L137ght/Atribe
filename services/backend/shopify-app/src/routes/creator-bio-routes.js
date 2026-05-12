import { Router } from "express";

import { creatorBioController } from "../controllers/creator-bio-controller.js";

export const creatorBioRouter = Router();

creatorBioRouter.get("/:identifier", creatorBioController.show);
