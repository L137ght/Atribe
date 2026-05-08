import { Router } from "express";

import { shopifyDebugController } from "../controllers/shopify-debug-controller.js";

export const shopifyDebugRouter = Router();

shopifyDebugRouter.get("/shops", shopifyDebugController.shops);
shopifyDebugRouter.get("/storefront-script", shopifyDebugController.storefrontScript);
shopifyDebugRouter.get("/shopify-install-status", shopifyDebugController.shopifyInstallStatus);
