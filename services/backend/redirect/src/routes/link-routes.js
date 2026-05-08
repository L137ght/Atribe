import { Router } from "express";

import { linkController } from "../controllers/link-controller.js";

export const linkRouter = Router();

linkRouter.post("/create", linkController.create);
