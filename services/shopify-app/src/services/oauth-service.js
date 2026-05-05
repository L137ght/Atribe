import { env } from "../config/env.js";
import { createNonce, safeCompare, toHexHmac } from "../utils/crypto.js";
import { isValidShopDomain, normalizeShopDomain } from "../utils/shopify-validators.js";
import { oauthStateStore } from "./oauth-state-store.js";

const isValidReturnTo = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    return Boolean(parsed.protocol);
  } catch {
    return false;
  }
};

const buildInstallRedirectUrl = ({ shop, state }) => {
  const redirectUri = env.shopifyCallbackUrl || `${env.shopifyAppUrl}/auth/callback`;
  const installUrl = new URL(`https://${shop}/admin/oauth/authorize`);

  installUrl.searchParams.set("client_id", env.shopifyApiKey);
  installUrl.searchParams.set("scope", env.shopifyScopes.join(","));
  installUrl.searchParams.set("redirect_uri", redirectUri);
  installUrl.searchParams.set("state", state);

  return installUrl.toString();
};

const buildCallbackHmacMessage = (rawQueryString) =>
  rawQueryString
    .split("&")
    .filter(Boolean)
    .filter((pair) => !pair.startsWith("hmac=") && !pair.startsWith("signature="))
    .sort((left, right) => left.localeCompare(right))
    .join("&");

export const oauthService = {
  createInstallUrl(rawShop, { returnTo = null } = {}) {
    const shop = normalizeShopDomain(rawShop);

    if (!isValidShopDomain(shop)) {
      throw new Error("Invalid Shopify shop domain.");
    }

    const state = createNonce();
    oauthStateStore.set(state, shop, {
      returnTo: isValidReturnTo(returnTo) ? String(returnTo).trim() : null
    });

    return {
      shop,
      state,
      installUrl: buildInstallRedirectUrl({ shop, state })
    };
  },

  validateCallback({ query, rawQueryString }) {
    const shop = normalizeShopDomain(query.shop);
    const state = String(query.state || "");
    const hmac = String(query.hmac || "");
    const code = String(query.code || "");

    if (!shop || !state || !hmac || !code) {
      throw new Error("Missing required OAuth callback parameters.");
    }

    if (!isValidShopDomain(shop)) {
      throw new Error("Invalid Shopify shop domain.");
    }

    const stateRecord = oauthStateStore.consume(state);
    if (!stateRecord || !safeCompare(stateRecord.shop, shop)) {
      throw new Error("Invalid or expired OAuth state.");
    }

    const message = buildCallbackHmacMessage(rawQueryString);
    const expectedHmac = toHexHmac(message, env.shopifyApiSecret);

    if (!safeCompare(expectedHmac, hmac)) {
      throw new Error("Invalid OAuth callback HMAC.");
    }

    return {
      shop,
      code,
      returnTo: stateRecord.metadata?.returnTo || null
    };
  },

  async exchangeCodeForAccessToken({ shop, code }) {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: env.shopifyApiKey,
        client_secret: env.shopifyApiSecret,
        code
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to exchange OAuth code for access token: ${errorText}`);
    }

    return response.json();
  }
};
