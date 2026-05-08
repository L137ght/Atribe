import "@shopify/shopify-api/adapters/node";
import { Session, shopifyApi } from "@shopify/shopify-api";

import { shopifyEnv } from "./shopify-env.js";

export const shopify = shopifyApi({
  apiKey: shopifyEnv.shopifyApiKey,
  apiSecretKey: shopifyEnv.shopifyApiSecret,
  scopes: shopifyEnv.shopifyScopes,
  hostName: new URL(shopifyEnv.shopifyAppUrl).host,
  apiVersion: shopifyEnv.shopifyApiVersion,
  isEmbeddedApp: false
});

export const buildOfflineSession = ({ shop, accessToken, scope = shopifyEnv.shopifyScopes.join(",") }) =>
  new Session({
    id: `offline_${shop}`,
    shop,
    state: "offline",
    isOnline: false,
    accessToken,
    scope
  });
