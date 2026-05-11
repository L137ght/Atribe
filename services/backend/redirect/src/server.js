import { createRedirectApp } from "./createApp.js";
import { sharedEnv } from "../../shopify-app/src/config/shared-env.js";
import { verifySupportFeatureStorage } from "../../shopify-app/src/db/support-feature-storage-check.js";

await verifySupportFeatureStorage();

const app = createRedirectApp();

app.listen(sharedEnv.port, sharedEnv.host, () => {
  console.log(`Redirect service listening on http://${sharedEnv.host}:${sharedEnv.port}`);
});
