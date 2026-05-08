import { Router } from "express";

import { dashboardController } from "../controllers/dashboard-controller.js";
import {
  attachAuthContext,
  requireAuthenticatedUser,
  requireCreatorBrandLinkOwnership,
  requireCreatorOwnership
} from "../middleware/auth-context.js";

export const dashboardRouter = Router();

dashboardRouter.use(attachAuthContext);

dashboardRouter.get("/creator/links", requireAuthenticatedUser, requireCreatorOwnership, dashboardController.creatorLinks);
dashboardRouter.get("/creator/earnings", requireAuthenticatedUser, requireCreatorOwnership, dashboardController.creatorEarnings);
dashboardRouter.get("/creator/orders", requireAuthenticatedUser, requireCreatorOwnership, dashboardController.creatorOrders);
dashboardRouter.get("/creator/brands", requireAuthenticatedUser, requireCreatorOwnership, dashboardController.creatorBrands);
dashboardRouter.post("/creator/brands", requireAuthenticatedUser, requireCreatorOwnership, dashboardController.creatorBrandCreate);
dashboardRouter.patch("/creator/brands/:id", requireAuthenticatedUser, requireCreatorBrandLinkOwnership, dashboardController.creatorBrandUpdate);
dashboardRouter.delete("/creator/brands/:id", requireAuthenticatedUser, requireCreatorBrandLinkOwnership, dashboardController.creatorBrandArchive);
dashboardRouter.get("/brand/shopify/install-status", requireAuthenticatedUser, dashboardController.brandInstallStatus);
dashboardRouter.get("/brand/orders", requireAuthenticatedUser, dashboardController.brandOrders);
dashboardRouter.get("/brand/commissions", requireAuthenticatedUser, dashboardController.brandCommissions);
dashboardRouter.get("/brand/creators", requireAuthenticatedUser, dashboardController.brandCreators);
dashboardRouter.get("/brand/clicks", requireAuthenticatedUser, dashboardController.brandClicks);
dashboardRouter.post("/brand/campaigns", requireAuthenticatedUser, dashboardController.brandCampaignCreate);
