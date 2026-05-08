/**
 * Shopify-specific environment configuration.
 * Requires SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_SCOPES, SHOPIFY_APP_URL.
 * Import this only in the shopify-app service.
 */
import { sharedEnv } from "./shared-env.js";

const requiredVars = ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET", "SHOPIFY_SCOPES", "SHOPIFY_APP_URL"];

for (const v of requiredVars) {
  if (!process.env[v]) {
    throw new Error(`Missing required Shopify environment variable: ${v}`);
  }
}

const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");
const normalizeOptionalUrl = (value) => {
  const n = String(value || "").trim();
  return n ? normalizeBaseUrl(n) : null;
};

export const shopifyEnv = {
  shopifyApiKey: process.env.SHOPIFY_API_KEY,
  shopifyApiSecret: process.env.SHOPIFY_API_SECRET,
  shopifyScopes: process.env.SHOPIFY_SCOPES.split(",").map((s) => s.trim()).filter(Boolean),
  shopifyAppUrl: normalizeBaseUrl(process.env.SHOPIFY_APP_URL),
  shopifyCallbackUrl: normalizeOptionalUrl(process.env.SHOPIFY_CALLBACK_URL || ""),
  shopifyApiVersion: process.env.SHOPIFY_API_VERSION || "2026-04"
};

// Combined env for backwards compatibility
export const env = { ...sharedEnv, ...shopifyEnv };

// Re-export sharedEnv for direct importers
export { sharedEnv };
