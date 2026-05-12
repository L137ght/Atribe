// Monorepo Expo shim: allow `expo start` from the repository root.
import { registerRootComponent } from "expo";

import App from "./apps/client/App";

registerRootComponent(App);
