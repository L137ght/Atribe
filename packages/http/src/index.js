// Middleware
export { corsMiddleware } from "../../../services/backend/shopify-app/src/middleware/cors.js";
export {
  attachAuthContext,
  requireAuthenticatedUser,
  requireSelfUserRouteIfAuthenticated,
  requireCreatorOwnership,
  requireCreatorBrandLinkOwnership
} from "../../../services/backend/shopify-app/src/middleware/auth-context.js";

// Utilities
export { logger } from "../../../services/backend/shopify-app/src/utils/logger.js";
export { appendQueryParams } from "../../../services/backend/shopify-app/src/utils/url.js";
export { getRawBodyString } from "../../../services/backend/shopify-app/src/utils/http.js";
export { createNonce, toBase64Hmac, toHexHmac, safeCompare } from "../../../services/backend/shopify-app/src/utils/crypto.js";

// HTML parsing (price history)
export {
  extractMetaContent,
  extractTagContent,
  extractTextBetween,
  extractScriptData,
  parsePrice,
  extractPriceNearLabel,
  extractLinks,
  extractChartData
} from "../../../services/backend/shopify-app/src/services/priceHistory/htmlParsers.js";

// Fetch helper (price history)
export { fetchHtml, createTimeoutSignal, buildSearchUrls } from "../../../services/backend/shopify-app/src/services/priceHistory/providers.js";
