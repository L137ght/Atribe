import { shopifyEnv as env } from "../config/shopify-env.js";
import { safeCompare, toBase64Hmac } from "../utils/crypto.js";
import { getRawBodyString } from "../utils/http.js";

export const verifyWebhookSignature = (req, res, next) => {
  const hmacHeader = req.get("x-shopify-hmac-sha256");
  const rawBody = getRawBodyString(req.body);
  const computedHmac = toBase64Hmac(rawBody, env.shopifyApiSecret);

  if (!hmacHeader || !safeCompare(computedHmac, hmacHeader)) {
    return res.status(401).json({ error: "Invalid webhook signature." });
  }

  req.rawBody = rawBody;
  return next();
};
