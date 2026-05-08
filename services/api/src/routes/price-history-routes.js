import { Router } from "express";

import { priceHistoryController } from "../controllers/price-history-controller.js";

export const priceHistoryRouter = Router();

priceHistoryRouter.get("/lookup", priceHistoryController.lookup);
