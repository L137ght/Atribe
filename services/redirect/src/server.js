import { createRedirectApp } from "./createApp.js";
import { sharedEnv } from "@atribe/config";

const app = createRedirectApp();

app.listen(sharedEnv.port, sharedEnv.host, () => {
  console.log(`Redirect service listening on http://${sharedEnv.host}:${sharedEnv.port}`);
});
