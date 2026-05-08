/**
 * Legacy backward-compatible env module.
 *
 * When imported, loads ONLY the shared (non-Shopify) environment.
 * DOES NOT throw if Shopify vars are missing.
 *
 * Existing code importing from "./env.js" gets the `env` object
 * with only shared fields populated. Shopify-specific fields will
 * be undefined unless shopify-env.js was loaded separately.
 *
 * For full Shopify env, import from "./shopify-env.js" instead.
 */
import { sharedEnv } from "./shared-env.js";

// Re-export the shared env as the legacy `env` for backward compat.
// Existing code that destructures `env.shopifyApiKey` will get `undefined`
// rather than a crash — callers that need Shopify values should import
// from "./shopify-env.js" or "./config/shopify.js".
export const env = { ...sharedEnv };
