import test from "node:test";
import assert from "node:assert/strict";

import { shareLinkController } from "../src/controllers/share-link-controller.js";
import { supportScoreController } from "../src/controllers/support-score-controller.js";
import { creatorRewardController } from "../src/controllers/creator-reward-controller.js";
import { creatorRepository } from "../../shopify-app/src/repositories/creator-repository.js";
import { shareLinkRepository } from "../../shopify-app/src/repositories/share-link-repository.js";
import { supportActionRepository } from "../../shopify-app/src/repositories/support-action-repository.js";
import { supportScoreRepository } from "../../shopify-app/src/repositories/support-score-repository.js";
import { creatorRewardRepository } from "../../shopify-app/src/repositories/creator-reward-repository.js";
import { rewardClaimRepository } from "../../shopify-app/src/repositories/reward-claim-repository.js";

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function withPatched(target, patches, run) {
  const originals = new Map();
  for (const [key, value] of Object.entries(patches)) {
    originals.set(key, target[key]);
    target[key] = value;
  }

  try {
    await run();
  } finally {
    for (const [key, value] of originals.entries()) {
      target[key] = value;
    }
  }
}

test("share-link controller creates a supported share link", async () => {
  const req = {
    auth: { userId: "supporter-1" },
    body: {
      creatorId: "creator-1",
      originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    get(header) {
      if (header === "user-agent") return "node-test";
      return "";
    },
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
  };
  const res = createRes();

  await withPatched(creatorRepository, {
    findById: async () => ({ id: "creator-1", userId: "creator-user-1" }),
  }, async () => {
    await withPatched(shareLinkRepository, {
      findByShortCode: async () => null,
      create: async ({ shortCode, ownerFingerprintHash }) => ({
        id: "share-link-1",
        shortCode,
        ownerFingerprintHash,
      }),
    }, async () => {
      await withPatched(supportActionRepository, {
        create: async () => {},
      }, async () => {
        await withPatched(supportScoreRepository, {
          incrementPoints: async () => {},
        }, async () => {
          await shareLinkController.create(req, res);
        });
      });
    });
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.pointsAwarded, 5);
  assert.match(res.body.shareUrl, /\/s\/.+$/);
});

test("share-link controller rejects unsafe or unsupported URLs", async () => {
  const unsafeReq = {
    auth: { userId: "supporter-1" },
    body: { creatorId: "creator-1", originalUrl: "javascript:alert(1)" },
  };
  const unsupportedReq = {
    auth: { userId: "supporter-1" },
    body: { creatorId: "creator-1", originalUrl: "https://example.com/blog-post" },
  };

  await withPatched(creatorRepository, {
    findById: async () => ({ id: "creator-1", userId: "creator-user-1" }),
  }, async () => {
    const unsafeRes = createRes();
    await shareLinkController.create(unsafeReq, unsafeRes);
    assert.equal(unsafeRes.statusCode, 400);
    assert.equal(unsafeRes.body.error, "originalUrl must use http or https.");

    const unsupportedRes = createRes();
    await shareLinkController.create(unsupportedReq, unsupportedRes);
    assert.equal(unsupportedRes.statusCode, 400);
    assert.match(unsupportedRes.body.error, /YouTube, Instagram, and X\/Twitter/);
  });
});

test("support-score controller returns creator-specific scores with next reward", async () => {
  const req = { auth: { userId: "supporter-1" } };
  const res = createRes();

  await withPatched(supportScoreRepository, {
    findBySupporter: async () => [{
      creatorId: "creator-1",
      lifetimePoints: 11,
      monthlyPoints: 7,
    }],
  }, async () => {
    await withPatched(creatorRepository, {
      findById: async () => ({ id: "creator-1", name: "Maya Creator" }),
    }, async () => {
      await withPatched(creatorRewardRepository, {
        findNextReward: async () => ({
          id: "reward-2",
          title: "Private Tribe Chat",
          requiredPoints: 25,
          pointsRemaining: 14,
        }),
      }, async () => {
        await supportScoreController.getScores(req, res);
      });
    });
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, [{
    creatorId: "creator-1",
    creatorName: "Maya Creator",
    lifetimePoints: 11,
    monthlyPoints: 7,
    nextReward: {
      id: "reward-2",
      title: "Private Tribe Chat",
      requiredPoints: 25,
      pointsRemaining: 14,
    },
  }]);
});

test("creator reward list hides locked destination URLs and claim returns not_enough_points", async () => {
  const listReq = {
    params: { creatorId: "creator-1" },
    auth: { userId: "supporter-1" },
  };
  const listRes = createRes();

  await withPatched(creatorRepository, {
    findById: async () => ({ id: "creator-1", userId: "creator-user-1" }),
  }, async () => {
    await withPatched(creatorRewardRepository, {
      findByCreatorId: async () => [{
        id: "reward-1",
        creatorId: "creator-1",
        title: "Early Deal Drops",
        description: "demo",
        rewardType: "early_access",
        requiredPoints: 10,
        deliveryType: "external_url",
        destinationUrl: "https://example.com/private",
        isActive: true,
      }],
      findById: async () => ({
        id: "reward-2",
        creatorId: "creator-1",
        title: "Private Tribe Chat",
        rewardType: "shared_community",
        requiredPoints: 25,
        destinationUrl: "https://discord.gg/example",
        isActive: true,
      }),
    }, async () => {
      await withPatched(supportScoreRepository, {
        findBySupporterAndCreator: async () => ({ lifetimePoints: 11 }),
      }, async () => {
        await withPatched(rewardClaimRepository, {
          findBySupporterAndCreator: async () => [],
          findByRewardAndSupporter: async () => null,
        }, async () => {
          await creatorRewardController.listRewards(listReq, listRes);
          const claimReq = {
            auth: { userId: "supporter-1" },
            params: { rewardId: "reward-2" },
          };
          const claimRes = createRes();
          await creatorRewardController.claimReward(claimReq, claimRes);

          assert.equal(listRes.statusCode, 200);
          assert.equal(listRes.body[0].destinationUrl, undefined);
          assert.equal(listRes.body[0].isUnlocked, true);

          assert.equal(claimRes.statusCode, 400);
          assert.equal(claimRes.body.error, "not_enough_points");
          assert.equal(claimRes.body.pointsRemaining, 14);
        });
      });
    });
  });
});
