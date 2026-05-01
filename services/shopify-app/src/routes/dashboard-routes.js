import { Router } from "express";

import { dashboardController } from "../controllers/dashboard-controller.js";

export const dashboardRouter = Router();

dashboardRouter.get("/creator/links", dashboardController.creatorLinks);
dashboardRouter.get("/creator/earnings", dashboardController.creatorEarnings);
dashboardRouter.get("/creator/orders", dashboardController.creatorOrders);
dashboardRouter.get("/brand/orders", dashboardController.brandOrders);
dashboardRouter.get("/brand/commissions", dashboardController.brandCommissions);
dashboardRouter.get("/brand/creators", dashboardController.brandCreators);
