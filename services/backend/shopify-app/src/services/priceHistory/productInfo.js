/**
 * Product URL parsing utilities.
 * Extracts marketplace, product ID, title candidate, and cache key
 * from Amazon and Flipkart product URLs.
 *
 * @module productInfo
 */

const SUPPORTED_MARKETPLACES = ["amazon.in", "amazon.com", "amzn.in", "flipkart.com"];

const STOP_WORDS = new Set([
  "for", "with", "and", "the", "new", "latest", "original",
  "black", "white", "india", "buy", "online", "price",
  "amazon", "flipkart", "pack", "combo", "size", "color"
]);

/**
 * @typedef {Object} ProductInfo
 * @property {boolean} isValid
 * @property {string} originalUrl
 * @property {string|null} marketplace - "amazon" | "flipkart" | null
 * @property {string} domain
 * @property {string} titleCandidate
 * @property {string|null} productId - ASIN or Flipkart PID
 * @property {string|null} asin
 * @property {string|null} flipkartPid
 * @property {string} cacheKey
 */

/**
 * Extract structured product info from an Amazon or Flipkart URL.
 * @param {string} inputUrl
 * @returns {ProductInfo}
 */
export function extractProductInfoFromUrl(inputUrl) {
  const base = {
    isValid: false,
    originalUrl: String(inputUrl || "").trim(),
    marketplace: null,
    domain: "",
    titleCandidate: "",
    productId: null,
    asin: null,
    flipkartPid: null,
    cacheKey: ""
  };

  if (!base.originalUrl) return base;

  /** @type {URL} */
  let parsed;
  try {
    parsed = new URL(base.originalUrl);
  } catch {
    return base;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return base;

  const hostname = parsed.hostname.toLowerCase();
  base.domain = hostname;

  const marketplace = SUPPORTED_MARKETPLACES.find(
    (mp) => hostname === mp || hostname.endsWith(`.${mp}`)
  );

  if (!marketplace) return base;

  base.isValid = true;

  if (marketplace.startsWith("amazon") || marketplace === "amzn.in") {
    base.marketplace = "amazon";
    const dpIndex = parsed.pathname.split("/").filter(Boolean).findIndex(
      (p) => p.toLowerCase() === "dp"
    );
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (dpIndex > 0) {
      base.titleCandidate = decodeURIComponent(pathParts[dpIndex - 1])
        .replace(/-/g, " ")
        .trim();
    }
    const asinMatch =
      parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/i) ||
      parsed.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    if (asinMatch?.[1]) {
      base.asin = asinMatch[1].toUpperCase();
      base.productId = base.asin;
    }
  } else {
    base.marketplace = "flipkart";
    const pid = parsed.searchParams.get("pid") || "";
    if (pid) {
      base.flipkartPid = pid;
      base.productId = pid;
    }
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const titlePart =
      pathParts.find((p) => !p.match(/^p$|^itm/i) && p.length > 4) ||
      pathParts[0] ||
      "";
    if (titlePart) {
      base.titleCandidate = decodeURIComponent(titlePart)
        .replace(/-/g, " ")
        .trim();
    }
  }

  base.cacheKey = buildCacheKey(base);
  return base;
}

/**
 * Build a deterministic cache key for a ProductInfo.
 * @param {ProductInfo} info
 * @returns {string}
 */
function buildCacheKey(info) {
  if (info.productId) {
    return `price-history:${info.marketplace}:${info.productId}`;
  }
  const normalizedTitle = (info.titleCandidate || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
  if (normalizedTitle) {
    return `price-history:${info.marketplace}:${normalizedTitle}`;
  }

  return `price-history:${info.marketplace}:${info.originalUrl}`;
}

/**
 * Extract meaningful word tokens from a string, filtering stop words.
 * @param {string} text
 * @returns {string[]}
 */
export function extractTokens(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Normalize a title into a URL-friendly slug.
 * @param {string} title
 * @returns {string}
 */
export function normalizeToSlug(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
