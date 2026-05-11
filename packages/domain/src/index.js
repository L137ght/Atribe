// Core business services
export { linkService } from "../../../services/backend/shopify-app/src/services/link-service.js";
export { orderAttributionService } from "../../../services/backend/shopify-app/src/services/order-attribution-service.js";
export { commissionService } from "../../../services/backend/shopify-app/src/services/commission-service.js";
export { dashboardService } from "../../../services/backend/shopify-app/src/services/dashboard-service.js";
export { couponService } from "../../../services/backend/shopify-app/src/services/coupon-service.js";
export { externalSelectionService } from "../../../services/backend/shopify-app/src/services/external-selection-service.js";
export { debugService } from "../../../services/backend/shopify-app/src/services/debug-service.js";

// Price history
export { getBestPriceHistoryForProductUrl } from "../../../services/backend/shopify-app/src/services/priceHistory/index.js";

// Support points & rewards
export { getPointsForAction } from "./support-points.js";
export { canUnlockReward, getRewardStatus } from "./reward-access.js";
export { classifyUrl } from "./url-classifier.js";
export { generateShortCode } from "./short-code.js";
