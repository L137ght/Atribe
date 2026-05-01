import "@shopify/shopify-api/adapters/node";
import { Session, shopifyApi } from "@shopify/shopify-api";

import { env } from "./env.js";

export const shopify = shopifyApi({
  apiKey: env.shopifyApiKey,
  apiSecretKey: env.shopifyApiSecret,
  scopes: env.shopifyScopes,
  hostName: new URL(env.shopifyAppUrl).host,
  apiVersion: env.shopifyApiVersion,
  isEmbeddedApp: false
});

export const buildOfflineSession = ({ shop, accessToken, scope = env.shopifyScopes.join(",") }) =>
  new Session({
    id: `offline_${shop}`,
    shop,
    state: "offline",
    isOnline: false,
    accessToken,
    scope
  });
