import Constants from "expo-constants";
import { Platform } from "react-native";

const extra = Constants.expoConfig?.extra || {};
const LOCAL_WEB_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOCAL_BACKEND_PORT = 3000;

const normalizeBaseUrl = (value) => {
  const normalized = String(value || "").trim().replace(/\/+$/, "");

  if (!normalized) {
    return "";
  }

  try {
    return new URL(normalized).toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
};

const getBundledBackendUrl = () =>
  normalizeBaseUrl(
    process.env.EXPO_PUBLIC_ATRIBE_BACKEND_URL ||
      process.env.REACT_APP_ATRIBE_BACKEND_URL ||
      extra.atribeBackendUrl ||
      ""
  );

const getLocalWebBackendUrl = () => {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return "";
  }

  const hostname = String(window.location.hostname || "").trim().toLowerCase();
  if (!LOCAL_WEB_HOSTS.has(hostname)) {
    return "";
  }

  // Local web runs on a different origin than the API, so prefer the colocated
  // backend during localhost development unless a query-string override is set.
  const explicitOverride = normalizeBaseUrl(
    new URLSearchParams(window.location.search).get("atribe_backend_url")
  );
  if (explicitOverride) {
    return explicitOverride;
  }

  const bundledBackendUrl = getBundledBackendUrl();
  if (bundledBackendUrl) {
    return "";
  }

  // Local web runs on a different origin than the API, so use the colocated
  // backend only when no explicit backend URL has been configured.
  return normalizeBaseUrl(`http://${hostname}:${LOCAL_BACKEND_PORT}`);
};

export const atribeBackendUrl = getLocalWebBackendUrl() || getBundledBackendUrl();

export const isAtribeBackendConfigured = Boolean(atribeBackendUrl);

export function getAtribeBackendUrl() {
  if (!isAtribeBackendConfigured) {
    throw new Error("Atribe backend URL is not configured. Set EXPO_PUBLIC_ATRIBE_BACKEND_URL.");
  }

  return atribeBackendUrl;
}

export function normalizeShopifyShopDomain(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  if (/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(rawValue)) {
    return rawValue.toLowerCase();
  }

  try {
    const parsed = new URL(rawValue);
    const hostname = parsed.hostname.toLowerCase();

    if (/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(hostname)) {
      return hostname;
    }

    if (hostname === "admin.shopify.com") {
      const match = parsed.pathname.match(/\/store\/([a-z0-9-]+)/i);
      if (match?.[1]) {
        return `${match[1].toLowerCase()}.myshopify.com`;
      }
    }
  } catch {
    return "";
  }

  return "";
}

export function isShopifyShopDomain(value) {
  return Boolean(normalizeShopifyShopDomain(value));
}

export function buildSupporterRouteUrl({ userId, destinationUrl }) {
  const backendBaseUrl = getAtribeBackendUrl();
  const normalizedUserId = String(userId || "").trim();
  const normalizedDestinationUrl = String(destinationUrl || "").trim();

  if (!normalizedUserId) {
    throw new Error("A signed-in shopper account is required before routing links.");
  }

  if (!normalizedDestinationUrl) {
    throw new Error("Paste a destination URL first.");
  }

  let parsed;
  try {
    parsed = new URL(normalizedDestinationUrl);
  } catch {
    throw new Error("Enter a valid destination URL, including https://");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Enter a valid destination URL, including https://");
  }

  return `${backendBaseUrl}/u/${encodeURIComponent(normalizedUserId)}/route?url=${encodeURIComponent(parsed.toString())}`;
}

export function buildBrandShopifyInstallUrl({ shopDomain, mobileRedirect }) {
  const backendBaseUrl = getAtribeBackendUrl();
  const normalizedShopDomain = normalizeShopifyShopDomain(shopDomain);

  if (!normalizedShopDomain) {
    throw new Error("Enter a valid Shopify store domain, like your-store.myshopify.com.");
  }

  const url = new URL(`${backendBaseUrl}/auth`);
  url.searchParams.set("shop", normalizedShopDomain);

  if (mobileRedirect) {
    url.searchParams.set("mobile_redirect", String(mobileRedirect).trim());
  }

  return url.toString();
}

export async function backendJson(path, { method = "GET", body, accessToken } = {}) {
  const backendBaseUrl = getAtribeBackendUrl();
  const url = `${backendBaseUrl}${path}`;
  const headers = {
    Accept: "application/json"
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const payload = parseJsonResponse(text);

  if (!response.ok) {
    throw new Error(payload?.error || `Backend request failed (${response.status}).`);
  }

  return payload;
}

function parseJsonResponse(text) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function createShareLink({ creatorId, originalUrl, accessToken }) {
  return backendJson("/api/share-links", {
    method: "POST",
    accessToken,
    body: {
      creatorId,
      originalUrl,
    },
  });
}

export async function fetchSupportScores(accessToken) {
  return backendJson("/api/support/scores", {
    accessToken,
  });
}

export async function fetchCreatorRewards({ creatorId, accessToken }) {
  return backendJson(`/api/creators/${encodeURIComponent(creatorId)}/rewards`, {
    accessToken,
  });
}

export async function fetchCreatorBio(identifier) {
  return backendJson(`/api/creator-bio/${encodeURIComponent(identifier)}`);
}

export async function syncCreatorBioContent({ creatorId, accessToken }) {
  return backendJson("/creator/bio/sync", {
    method: "POST",
    accessToken,
    body: {
      creator_id: creatorId,
    },
  });
}

export async function createCreatorReward({
  title,
  description,
  rewardType,
  requiredPoints,
  deliveryType,
  destinationUrl,
  isActive,
  accessToken,
}) {
  return backendJson("/api/creator/rewards", {
    method: "POST",
    accessToken,
    body: {
      title,
      description,
      rewardType,
      requiredPoints,
      deliveryType,
      destinationUrl,
      isActive,
    },
  });
}

export async function claimReward({ rewardId, accessToken }) {
  return backendJson(`/api/rewards/${encodeURIComponent(rewardId)}/claim`, {
    method: "POST",
    accessToken,
  });
}
