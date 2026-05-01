import { Router } from "express";

import { storefrontScriptController } from "../controllers/storefront-script-controller.js";

export const storefrontRouter = Router();

storefrontRouter.get("/atribe.js", storefrontScriptController.serve);
