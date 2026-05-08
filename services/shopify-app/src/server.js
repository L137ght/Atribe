import { createShopifyApp } from "./createShopifyApp.js";
import { env } from "@atribe/config/shopify";

const app = createShopifyApp();

app.listen(env.port, env.host, () => {
  console.log(`Shopify service listening on http://${env.host}:${env.port}`);
});
