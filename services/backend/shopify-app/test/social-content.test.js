import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchLatestSocialContent,
  getSocialContentAdapter,
  isAutomaticSocialContentSupported
} from "../src/services/social-content/index.js";

test("social content adapters identify supported automatic providers", () => {
  assert.equal(isAutomaticSocialContentSupported("youtube"), true);
  assert.equal(isAutomaticSocialContentSupported("instagram"), true);
  assert.equal(isAutomaticSocialContentSupported("tiktok"), true);
  assert.equal(isAutomaticSocialContentSupported("x"), true);
  assert.equal(isAutomaticSocialContentSupported("discord"), false);
});

test("social content fetch returns missing credentials without exposing token handling to clients", async () => {
  const result = await fetchLatestSocialContent({
    account: { platform: "youtube" },
    credentials: null
  });

  assert.equal(result.status, "missing_credentials");
  assert.deepEqual(result.items, []);
});

test("unsupported social content providers do not resolve an adapter", () => {
  assert.equal(getSocialContentAdapter("spotify"), null);
});
