import test from "node:test";
import assert from "node:assert/strict";

import { shareRedirectController } from "../src/controllers/share-redirect-controller.js";
import { shareLinkRepository } from "../../shopify-app/src/repositories/share-link-repository.js";
import { shareClickRepository } from "../../shopify-app/src/repositories/share-click-repository.js";
import { supportActionRepository } from "../../shopify-app/src/repositories/support-action-repository.js";
import { supportScoreRepository } from "../../shopify-app/src/repositories/support-score-repository.js";
import { buildVisitorFingerprint, hashValue } from "../../shopify-app/src/utils/request-fingerprint.js";

function createRes() {
  return {
    statusCode: 200,
    redirectCode: null,
    redirectUrl: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    redirect(code, url) {
      this.redirectCode = code;
      this.redirectUrl = url;
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

test("share redirect prevents owner fingerprint self-clicks from earning points", async () => {
  const ipHash = hashValue("127.0.0.1");
  const uaHash = hashValue("node-test");
  const ownerFingerprintHash = buildVisitorFingerprint(ipHash, uaHash);

  const req = {
    params: { shortCode: "abc123" },
    auth: { userId: null },
    get(header) {
      if (header === "x-forwarded-for") return "127.0.0.1";
      if (header === "user-agent") return "node-test";
      return "";
    },
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
  };
  const res = createRes();
  let clickPayload = null;
  let createdAction = false;
  let incrementedPoints = false;

  await withPatched(shareLinkRepository, {
    findByShortCode: async () => ({
      id: "share-link-1",
      shortCode: "abc123",
      originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      supporterId: "supporter-1",
      creatorId: "creator-1",
      platform: "youtube",
      ownerFingerprintHash,
    }),
    incrementClickCount: async () => {},
  }, async () => {
    await withPatched(shareClickRepository, {
      findRecentByFingerprint: async () => null,
      create: async (payload) => {
        clickPayload = payload;
      },
    }, async () => {
      await withPatched(supportActionRepository, {
        create: async () => {
          createdAction = true;
        },
      }, async () => {
        await withPatched(supportScoreRepository, {
          incrementPoints: async () => {
            incrementedPoints = true;
          },
        }, async () => {
          await shareRedirectController.redirect(req, res);
        });
      });
    });
  });

  assert.equal(res.redirectCode, 302);
  assert.equal(res.redirectUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(clickPayload.wasSelfClick, true);
  assert.equal(clickPayload.awardedPoints, 0);
  assert.equal(createdAction, false);
  assert.equal(incrementedPoints, false);
});

test("share redirect sends missing codes to the safe fallback", async () => {
  const req = {
    params: { shortCode: "missing" },
    auth: {},
    get() {
      return "";
    },
  };
  const res = createRes();

  await withPatched(shareLinkRepository, {
    findByShortCode: async () => null,
  }, async () => {
    await shareRedirectController.redirect(req, res);
  });

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, "Share link not found.");
});
