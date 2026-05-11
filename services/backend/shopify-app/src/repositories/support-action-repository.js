import crypto from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchOne, fetchMany, insertRow } from "./supabase/shared.js";

export const supportActionRepository = {
  async create({ supporterId, creatorId, actionType, points, sourceType, sourceUrl, destinationUrl, shareLinkId, rewardId, metadata }) {
    const createdAt = new Date().toISOString();

    if (env.dbProvider === "supabase") {
      await insertRow("support_actions", {
        supporter_id: supporterId,
        creator_id: creatorId,
        action_type: actionType,
        points,
        source_type: sourceType || null,
        source_url: sourceUrl || null,
        destination_url: destinationUrl || null,
        share_link_id: shareLinkId || null,
        reward_id: rewardId || null,
        metadata: metadata || {},
        created_at: createdAt,
      });
      return;
    }

    const id = crypto.randomUUID();
    const statement = db.prepare(`
      INSERT INTO support_actions (id, supporter_id, creator_id, action_type, points, source_type, source_url, destination_url, share_link_id, reward_id, metadata, created_at)
      VALUES (@id, @supporterId, @creatorId, @actionType, @points, @sourceType, @sourceUrl, @destinationUrl, @shareLinkId, @rewardId, @metadata, @createdAt)
    `);

    statement.run({
      id,
      supporterId,
      creatorId,
      actionType,
      points,
      sourceType: sourceType || null,
      sourceUrl: sourceUrl || null,
      destinationUrl: destinationUrl || null,
      shareLinkId: shareLinkId || null,
      rewardId: rewardId || null,
      metadata: JSON.stringify(metadata || {}),
      createdAt,
    });
  },
};
