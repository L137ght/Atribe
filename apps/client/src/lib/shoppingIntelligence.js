import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "atribe.shopping-intelligence.products";
const KNOWN_BRANDS = new Set([
  "apple",
  "samsung",
  "sony",
  "lg",
  "nike",
  "adidas",
  "philips",
  "boat",
  "jbl",
  "lenovo",
  "hp",
  "dell",
  "puma",
  "asus",
  "acer",
  "mi",
  "xiaomi",
  "oneplus",
  "realme",
  "oppo",
  "vivo",
  "haier",
  "bajaj",
  "prestige",
  "havells",
  "anker",
  "casio",
  "titan"
]);
const URGENCY_TERMS = [
  "offer ends",
  "limited time",
  "deal ends",
  "hurry",
  "only few left",
  "lightning deal",
  "last chance",
  "ending soon"
];
const GENERIC_RISK_TOKENS = [
  "wireless",
  "bluetooth",
  "portable",
  "smart",
  "premium",
  "new",
  "latest",
  "quality",
  "best",
  "combo"
];
const STOP_WORDS = new Set([
  "amazon",
  "flipkart",
  "products",
  "product",
  "store",
  "shop",
  "buy",
  "online",
  "india",
  "with",
  "for",
  "and",
  "the",
  "new",
  "best",
  "pack",
  "combo"
]);

function normalizeUrl(url) {
  const value = String(url || "").trim();
  const parsed = new URL(value);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Enter a valid shopping link, including https://");
  }

  return parsed;
}

function sanitizeToken(token) {
  return String(token || "")
    .replace(/[%+]/g, " ")
    .replace(/[^a-z0-9\s-]/gi, " ")
    .trim();
}

function tokenize(value) {
  return sanitizeToken(value)
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean);
}

function toTitleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

function buildFallbackProductKey(parsed) {
  const normalized = new URL(parsed.toString());
  normalized.hash = "";
  const queryPairs = Array.from(normalized.searchParams.entries())
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`);

  normalized.search = queryPairs.length ? `?${queryPairs.join("&")}` : "";

  return `url:${normalized.toString()}`;
}

function extractAmazonIdentity(parsed) {
  const asinMatch =
    parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/i) ||
    parsed.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  const slugMatch = parsed.pathname.match(/\/([a-z0-9-]+)\/(?:dp|gp\/product)\//i);
  const slug = slugMatch?.[1] || "";
  const slugTokens = tokenize(slug);
  const productTitle = slugTokens.length ? toTitleCase(slugTokens.slice(0, 8).join(" ")) : "";

  return {
    productId: asinMatch?.[1]?.toUpperCase() || "",
    productKey: asinMatch?.[1] ? `amazon:${asinMatch[1].toUpperCase()}` : buildFallbackProductKey(parsed),
    productTitle,
    brandCandidate: slugTokens[0] || "",
    slugTokens
  };
}

function extractFlipkartIdentity(parsed) {
  const pid = parsed.searchParams.get("pid") || "";
  const slugMatch = parsed.pathname.match(/\/([a-z0-9-]+)\/p\//i);
  const slug = slugMatch?.[1] || "";
  const slugTokens = tokenize(slug);
  const productTitle = slugTokens.length ? toTitleCase(slugTokens.slice(0, 8).join(" ")) : "";

  return {
    productId: pid,
    productKey: pid ? `flipkart:${pid}` : buildFallbackProductKey(parsed),
    productTitle,
    brandCandidate: slugTokens[0] || "",
    slugTokens
  };
}

function extractShopifyIdentity(parsed) {
  const handleMatch = parsed.pathname.match(/\/products\/([^/?#]+)/i);
  const handle = handleMatch?.[1] || "";
  const slugTokens = tokenize(handle);
  const hostname = parsed.hostname.toLowerCase();
  const shopName = hostname.split(".")[0].replace(/-/g, " ");
  const productTitle = slugTokens.length ? toTitleCase(slugTokens.slice(0, 8).join(" ")) : "";

  return {
    productId: handle,
    productKey: handle ? `shopify:${hostname}:${handle}` : buildFallbackProductKey(parsed),
    productTitle,
    brandCandidate: hostname.endsWith(".myshopify.com") ? shopName.split(" ")[0] || "" : shopName,
    slugTokens
  };
}

function extractGenericIdentity(parsed) {
  const pathTokens = tokenize(parsed.pathname);
  const hostname = parsed.hostname.toLowerCase();

  return {
    productId: "",
    productKey: buildFallbackProductKey(parsed),
    productTitle: pathTokens.length ? toTitleCase(pathTokens.slice(0, 8).join(" ")) : "",
    brandCandidate: pathTokens[0] || hostname.split(".")[0] || "",
    slugTokens: pathTokens
  };
}

function extractProductIdentity(parsed) {
  const hostname = parsed.hostname.toLowerCase();

  if (hostname.includes("amazon.")) {
    return extractAmazonIdentity(parsed);
  }

  if (hostname.includes("flipkart.")) {
    return extractFlipkartIdentity(parsed);
  }

  if (parsed.pathname.includes("/products/")) {
    return extractShopifyIdentity(parsed);
  }

  return extractGenericIdentity(parsed);
}

async function readProductStore() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeProductStore(value) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function parsePossiblePrice(value) {
  const match = String(value || "").match(/(?:₹|rs\.?|inr)\s*([0-9][0-9,]*)/i);

  if (!match?.[1]) {
    return null;
  }

  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildPriceSignalFromPriceHistory(priceHistoryData) {
  const currentPrice = parsePossiblePrice(priceHistoryData?.currentPrice);
  const lowestSeen = parsePossiblePrice(priceHistoryData?.lowestPrice);

  if (!currentPrice || !lowestSeen) {
    return null;
  }

  const percentAboveLow = Math.max(
    0,
    Math.round(((currentPrice - lowestSeen) / lowestSeen) * 100)
  );

  if (percentAboveLow <= 5) {
    return {
      status: "good",
      label: "Good price",
      detail: `Lowest seen: ${formatCurrency(lowestSeen)} · Current: ${formatCurrency(currentPrice)}`,
      currentPrice,
      lowestSeen,
      percentAboveLow
    };
  }

  if (percentAboveLow <= 20) {
    return {
      status: "average",
      label: "Average price",
      detail: `${percentAboveLow}% above known low · Current: ${formatCurrency(currentPrice)}`,
      currentPrice,
      lowestSeen,
      percentAboveLow
    };
  }

  return {
    status: "high",
    label: "Price looks high",
    detail: `${percentAboveLow}% above known low · Lowest seen: ${formatCurrency(lowestSeen)}`,
    currentPrice,
    lowestSeen,
    percentAboveLow
  };
}

function buildPriceSignal(record, currentPrice) {
  const observedPrices = Array.isArray(record?.observed_prices)
    ? record.observed_prices
        .map((entry) => Number(entry?.price))
        .filter((price) => Number.isFinite(price) && price > 0)
    : [];
  const effectiveCurrentPrice = currentPrice || Number(record?.last_known_price) || null;

  if (!effectiveCurrentPrice || observedPrices.length === 0) {
    return {
      status: "unknown",
      label: "Not enough price history yet",
      detail: "We’ll start tracking this product now.",
      currentPrice: effectiveCurrentPrice,
      lowestSeen: null,
      percentAboveLow: null
    };
  }

  const lowestSeen = Math.min(...observedPrices, effectiveCurrentPrice);
  const percentAboveLow = Math.max(
    0,
    Math.round(((effectiveCurrentPrice - lowestSeen) / lowestSeen) * 100)
  );

  if (percentAboveLow <= 5) {
    return {
      status: "good",
      label: "Good price",
      detail: `Lowest seen: ${formatCurrency(lowestSeen)} · Current: ${formatCurrency(effectiveCurrentPrice)}`,
      currentPrice: effectiveCurrentPrice,
      lowestSeen,
      percentAboveLow
    };
  }

  if (percentAboveLow <= 20) {
    return {
      status: "average",
      label: "Average price",
      detail: `${percentAboveLow}% above recent low · Current: ${formatCurrency(effectiveCurrentPrice)}`,
      currentPrice: effectiveCurrentPrice,
      lowestSeen,
      percentAboveLow
    };
  }

  return {
    status: "high",
    label: "Price looks high",
    detail: `${percentAboveLow}% above recent low · Lowest seen: ${formatCurrency(lowestSeen)}`,
    currentPrice: effectiveCurrentPrice,
    lowestSeen,
    percentAboveLow
  };
}

function buildUrgencySignal(url, extraText = "") {
  const haystack = `${url} ${extraText}`.toLowerCase();
  const matchedTerm = URGENCY_TERMS.find((term) => haystack.includes(term));

  if (matchedTerm) {
    return {
      status: "warning",
      label: matchedTerm.includes("few left") ? "Deal claim needs checking" : "Timer may be misleading",
      detail: "Buy based on price, not pressure."
    };
  }

  return {
    status: "clear",
    label: "No urgency warning",
    detail: "No pressure cues spotted from this link yet."
  };
}

function buildBrandSignal(domain, identity) {
  const brandCandidate = toTitleCase(identity.brandCandidate);
  const slugTokens = identity.slugTokens || [];
  const joinedTokens = slugTokens.join(" ");
  const knownBrand = slugTokens.find((token) => KNOWN_BRANDS.has(token.toLowerCase()));

  if (knownBrand) {
    return {
      status: "known",
      label: "Known brand",
      detail: "Known brand signals found in the product link.",
      brandName: toTitleCase(knownBrand)
    };
  }

  const genericSignalCount = slugTokens.filter((token) => GENERIC_RISK_TOKENS.includes(token)).length;
  const shortUsefulTokens = slugTokens.filter(
    (token) => token.length > 2 && !STOP_WORDS.has(token)
  );

  if (shortUsefulTokens.length <= 1 && genericSignalCount >= 1) {
    return {
      status: "risk",
      label: "Unknown brand risk",
      detail: "Compare reviews and seller before buying.",
      brandName: brandCandidate
    };
  }

  if (domain.includes("amazon.") || domain.includes("flipkart.") || domain.includes("myntra.") || domain.includes("ajio.")) {
    return {
      status: "unknown",
      label: brandCandidate ? "Unknown brand" : "Compare alternatives",
      detail: brandCandidate
        ? "This brand has limited trust signals."
        : "Compare with known alternatives before buying.",
      brandName: brandCandidate
    };
  }

  if (joinedTokens || brandCandidate) {
    return {
      status: "unknown",
      label: "Unknown brand",
      detail: "Check reviews and seller before buying.",
      brandName: brandCandidate
    };
  }

  return {
    status: "unknown",
    label: "Compare alternatives",
    detail: "Compare with known alternatives before buying.",
    brandName: ""
  };
}

async function upsertObservedProduct({ domain, parsed, identity, currentPrice }) {
  const store = await readProductStore();
  const now = new Date().toISOString();
  const existingRecord = store[identity.productKey] || {};
  const nextObservedPrices = Array.isArray(existingRecord.observed_prices)
    ? [...existingRecord.observed_prices]
    : [];

  if (currentPrice) {
    const latestObservedPrice = nextObservedPrices[nextObservedPrices.length - 1]?.price;

    if (latestObservedPrice !== currentPrice) {
      nextObservedPrices.push({
        price: currentPrice,
        observed_at: now
      });
    }
  }

  const nextRecord = {
    product_key: identity.productKey,
    domain,
    source_url: parsed.toString(),
    product_id: identity.productId || null,
    product_title: identity.productTitle || "",
    first_seen_at: existingRecord.first_seen_at || now,
    last_seen_at: now,
    observed_prices: nextObservedPrices,
    last_known_price: currentPrice || existingRecord.last_known_price || null
  };

  store[identity.productKey] = nextRecord;
  await writeProductStore(store);

  return nextRecord;
}

export async function recordObservedPrice(productKey, price) {
  const normalizedPrice = Number(price);

  if (!productKey || !Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
    return null;
  }

  const store = await readProductStore();
  const existingRecord = store[productKey];

  if (!existingRecord) {
    return null;
  }

  const nextRecord = {
    ...existingRecord,
    last_seen_at: new Date().toISOString(),
    last_known_price: normalizedPrice,
    observed_prices: [
      ...(Array.isArray(existingRecord.observed_prices) ? existingRecord.observed_prices : []),
      {
        price: normalizedPrice,
        observed_at: new Date().toISOString()
      }
    ]
  };

  store[productKey] = nextRecord;
  await writeProductStore(store);
  return nextRecord;
}

export async function analyzeShoppingLink(url, options = {}) {
  const parsed = normalizeUrl(url);
  const domain = parsed.hostname.toLowerCase();
  const identity = extractProductIdentity(parsed);
  const currentPrice = parsePossiblePrice(`${url} ${options.pageTitle || ""} ${options.htmlSnippet || ""}`);
  const record = await upsertObservedProduct({
    domain,
    parsed,
    identity,
    currentPrice
  });

  return {
    domain,
    productId: identity.productId || identity.productKey,
    productKey: identity.productKey,
    productTitle: identity.productTitle || "",
    priceSignal: buildPriceSignal(record, currentPrice),
    urgencySignal: buildUrgencySignal(url, `${options.pageTitle || ""} ${options.htmlSnippet || ""}`),
    brandSignal: buildBrandSignal(domain, identity)
  };
}

// TODO: replace this local analyzer with GET /shopping-intel/analyze?url=... when backend intel is ready.
// TODO: feed page title / HTML snippet from WebView metadata to improve urgency and price detection.
