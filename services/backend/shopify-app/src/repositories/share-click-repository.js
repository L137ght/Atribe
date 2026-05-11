import crypto from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { fetchMany, insertRow } from "./supabase/shared.js";

export const shareClickRepository = {
  async create({ shareLinkId, visitorUserId, visitorFingerprintHash, ipHash, userAgentHash, awardedPoints, wasSelfClick, wasDuplicate, referrer }) {
    if (env.dbProvider === "supabase") {
      await insertRow("share_link_clicks", {
        share_link_id: shareLinkId,
        visitor_user_id: visitorUserId || null,
        visitor_fingerprint_hash: visitorFingerprintHash || null,
        ip_hash: ipHash || null,
        user_agent_hash: userAgentHash || null,
        awarded_points: awardedPoints,
        was_self_click: wasSelfClick,
        was_duplicate: wasDuplicate,
        referrer: referrer || null,
        created_at: new Date().toISOString(),
      });
      return;
    }

    const id = crypto.randomUUID();
    const statement = db.prepare(`
      INSERT INTO share_link_clicks (id, share_link_id, visitor_user_id, visitor_fingerprint_hash, ip_hash, user_agent_hash, awarded_points, was_self_click, was_duplicate, referrer, created_at)
      VALUES (@id, @shareLinkId, @visitorUserId, @visitorFingerprintHash, @ipHash, @userAgentHash, @awardedPoints, @wasSelfClick, @wasDuplicate, @referrer, @createdAt)
    `);

    statement.run({
      id,
      shareLinkId,
      visitorUserId: visitorUserId || null,
      visitorFingerprintHash: visitorFingerprintHash || null,
      ipHash: ipHash || null,
      userAgentHash: userAgentHash || null,
      awardedPoints,
      wasSelfClick: wasSelfClick ? 1 : 0,
      wasDuplicate: wasDuplicate ? 1 : 0,
      referrer: referrer || null,
      createdAt: new Date().toISOString(),
    });
  },

  async findRecentByFingerprint(shareLinkId, fingerprintHash, windowMs = 86400000) {
    if (env.dbProvider === "supabase") {
      const since = new Date(Date.now() - windowMs).toISOString();
      const rows = await fetchMany({
        tableName: "share_link_clicks",
        columns: "id, created_at",
        filters: {
          share_link_id: shareLinkId,
          visitor_fingerprint_hash: fingerprintHash,
        },
        orderBy: "created_at",
        ascending: false,
        limit: 1,
      });

      return rows.length > 0 ? rows[0].created_at > since ? rows[0] : null : null;
    }

    const since = new Date(Date.now() - windowMs).toISOString();
    const statement = db.prepare(`
      SELECT id, created_at AS createdAt
      FROM share_link_clicks
      WHERE share_link_id = ? AND visitor_fingerprint_hash = ? AND created_at > ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

    return statement.get(shareLinkId, fingerprintHash, since) || null;
  },
};
