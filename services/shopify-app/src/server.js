import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.port, env.host, () => {
  console.log(`Shopify app backend listening on http://${env.host}:${env.port}`);
});
