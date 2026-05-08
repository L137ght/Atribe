import { createApiApp } from "./createApp.js";
import { sharedEnv } from "../../shopify-app/src/config/shared-env.js";

const app = createApiApp();

app.listen(sharedEnv.port, sharedEnv.host, () => {
  console.log(`API service listening on http://${sharedEnv.host}:${sharedEnv.port}`);
});
