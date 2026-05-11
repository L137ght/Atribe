import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyUrl,
  generateShortCode,
  getPointsForAction,
  canUnlockReward,
  getRewardStatus,
} from "../src/index.js";

test("classifyUrl detects supported creator content platforms", () => {
  assert.deepEqual(classifyUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), {
    category: "creator_content",
    platform: "youtube",
    normalizedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    contentType: "video",
  });

  assert.equal(classifyUrl("https://instagram.com/p/demo").platform, "instagram");
  assert.equal(classifyUrl("https://x.com/someone/status/1").platform, "x");
  assert.equal(classifyUrl("https://example.com").category, "unknown");
});

test("getPointsForAction returns configured values and defaults unknown actions to zero", () => {
  assert.equal(getPointsForAction("shopping_link_routed"), 20);
  assert.equal(getPointsForAction("creator_content_share_created"), 5);
  assert.equal(getPointsForAction("creator_content_share_clicked"), 2);
  assert.equal(getPointsForAction("reward_claimed"), 0);
  assert.equal(getPointsForAction("does_not_exist"), 0);
});

test("reward access helpers use lifetime points for unlocks", () => {
  const reward = { requiredPoints: 10 };
  const supportScore = { lifetimePoints: 12 };

  assert.equal(canUnlockReward({ supportScore, reward }), true);
  assert.deepEqual(getRewardStatus({ supportScore, reward, claim: null }), {
    isUnlocked: true,
    isClaimed: false,
    pointsRemaining: 0,
  });
  assert.deepEqual(getRewardStatus({ supportScore: { lifetimePoints: 4 }, reward, claim: null }), {
    isUnlocked: false,
    isClaimed: false,
    pointsRemaining: 6,
  });
});

test("generateShortCode returns URL-safe ambiguous-free codes", () => {
  const code = generateShortCode(12);
  assert.equal(code.length, 12);
  assert.match(code, /^[abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/);
});
