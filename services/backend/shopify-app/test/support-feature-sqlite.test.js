import crypto from "node:crypto";

import test from "node:test";
import assert from "node:assert/strict";

process.env.DB_PROVIDER = "sqlite";
process.env.SQLITE_DB_PATH = "/private/tmp/atribe-support-feature-test.db";

const { db } = await import("../src/db/database.js");
const { shareLinkRepository } = await import("../src/repositories/share-link-repository.js");
const { supportScoreRepository } = await import("../src/repositories/support-score-repository.js");
const { creatorRewardRepository } = await import("../src/repositories/creator-reward-repository.js");

test("sqlite support feature tables exist", () => {
  const tables = [
    "support_actions",
    "support_scores",
    "share_links",
    "share_link_clicks",
    "creator_rewards",
    "reward_claims",
  ];

  for (const tableName of tables) {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
    assert.equal(row.name, tableName);
  }
});

test("sqlite repositories can persist support feature records", async () => {
  const supporterId = crypto.randomUUID();
  const creatorId = crypto.randomUUID();
  const shortCode = `sqlite${Date.now()}`;
  const shareLink = await shareLinkRepository.create({
    id: crypto.randomUUID(),
    shortCode,
    supporterId,
    creatorId,
    originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    normalizedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    platform: "youtube",
    title: null,
    contentType: "video",
    ownerFingerprintHash: "fingerprint-1",
  });

  await supportScoreRepository.incrementPoints(supporterId, creatorId, 5);

  const reward = await creatorRewardRepository.create({
    creatorId,
    title: "Early Deal Drops",
    description: "Seed reward",
    rewardType: "early_access",
    requiredPoints: 10,
    deliveryType: "external_url",
    destinationUrl: "https://example.com/private",
    isActive: true,
  });

  const score = await supportScoreRepository.findBySupporterAndCreator(supporterId, creatorId);

  assert.equal(shareLink.shortCode, shortCode);
  assert.equal(score.lifetimePoints, 5);
  assert.equal(reward.title, "Early Deal Drops");
});
