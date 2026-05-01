import express, { Router } from "express";

import { webhookController } from "../controllers/webhook-controller.js";
import { verifyWebhookSignature } from "../middleware/webhook-verification.js";

export const webhookRouter = Router();

// Shopify webhook verification must use the exact raw request body.
webhookRouter.post(
  "/orders_create",
  express.raw({ type: "application/json" }),
  verifyWebhookSignature,
  webhookController.ordersCreate
);

webhookRouter.post(
  "/orders_paid",
  express.raw({ type: "application/json" }),
  verifyWebhookSignature,
  webhookController.ordersPaid
);

webhookRouter.post(
  "/orders_cancelled",
  express.raw({ type: "application/json" }),
  verifyWebhookSignature,
  webhookController.ordersCancelled
);

webhookRouter.post(
  "/refunds_create",
  express.raw({ type: "application/json" }),
  verifyWebhookSignature,
  webhookController.refundsCreate
);

webhookRouter.post(
  "/app_uninstalled",
  express.raw({ type: "application/json" }),
  verifyWebhookSignature,
  webhookController.appUninstalled
);

webhookRouter.post(
  "/customers_data_request",
  express.raw({ type: "application/json" }),
  verifyWebhookSignature,
  webhookController.customersDataRequest
);

webhookRouter.post(
  "/customers_redact",
  express.raw({ type: "application/json" }),
  verifyWebhookSignature,
  webhookController.customersRedact
);

webhookRouter.post(
  "/shop_redact",
  express.raw({ type: "application/json" }),
  verifyWebhookSignature,
  webhookController.shopRedact
);
