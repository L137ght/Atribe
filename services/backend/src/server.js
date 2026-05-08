import { createBackendApp } from "./createApp.js";
import { sharedEnv } from "../shopify-app/src/config/shared-env.js";

const app = createBackendApp();

app.listen(sharedEnv.port, sharedEnv.host, () => {
  console.log(`Atribe backend listening on http://${sharedEnv.host}:${sharedEnv.port}`);
});
