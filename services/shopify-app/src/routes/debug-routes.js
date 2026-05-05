import { Router } from "express";

import { debugController } from "../controllers/debug-controller.js";

export const debugRouter = Router();

debugRouter.get("/shops", debugController.shops);
debugRouter.get("/clicks/latest", debugController.latestClicks);
debugRouter.get("/links/latest", debugController.latestLinks);
debugRouter.get("/orders/latest", debugController.latestOrders);
debugRouter.get("/attribution/latest", debugController.latestAttributions);
debugRouter.get("/storefront-script", debugController.storefrontScript);
debugRouter.get("/shopify-install-status", debugController.shopifyInstallStatus);
debugRouter.get("/user-creator-weights", debugController.userCreatorWeights);
debugRouter.get("/user-route-clicks/latest", debugController.latestUserRouteClicks);
debugRouter.get("/user-value-distribution", debugController.userValueDistribution);
debugRouter.get("/snapshot/:snapshot_id", debugController.snapshot);
debugRouter.post("/seed-user-weights", debugController.seedUserWeights);
