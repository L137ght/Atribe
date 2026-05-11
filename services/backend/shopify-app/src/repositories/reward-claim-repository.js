import crypto from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchOne, fetchMany } from "./supabase/shared.js";

export const rewardClaimRepository = {
  async claim({ rewardId, supporterId, creatorId }) {
    const now = new Date().toISOString();

    if (env.dbProvider === "supabase") {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("reward_claims")
        .insert({
          reward_id: rewardId,
          supporter_id: supporterId,
          creator_id: creatorId,
          claimed_at: now,
        })
        .select("id, reward_id, supporter_id, creator_id, claimed_at")
        .single();

      if (error) {
        if (error.code === "23505") {
          return null;
        }
        throw new Error(`Supabase insert failed for reward_claims: ${error.message}`);
      }

      return {
        id: data.id,
        rewardId: data.reward_id,
        supporterId: data.supporter_id,
        creatorId: data.creator_id,
        claimedAt: data.claimed_at,
      };
    }

    try {
      const id = crypto.randomUUID();
      const statement = db.prepare(`
        INSERT INTO reward_claims (id, reward_id, supporter_id, creator_id, claimed_at)
        VALUES (@id, @rewardId, @supporterId, @creatorId, @claimedAt)
      `);

      statement.run({ id, rewardId, supporterId, creatorId, claimedAt: now });

      return { id, rewardId, supporterId, creatorId, claimedAt: now };
    } catch {
      return null;
    }
  },

  async findByRewardAndSupporter(rewardId, supporterId) {
    if (env.dbProvider === "supabase") {
      const row = await fetchOne(
        "reward_claims",
        "id, reward_id, supporter_id, creator_id, claimed_at",
        { reward_id: rewardId, supporter_id: supporterId }
      );

      if (!row) return null;

      return {
        id: row.id,
        rewardId: row.reward_id,
        supporterId: row.supporter_id,
        creatorId: row.creator_id,
        claimedAt: row.claimed_at,
      };
    }

    const statement = db.prepare(`
      SELECT
        id, reward_id AS rewardId, supporter_id AS supporterId,
        creator_id AS creatorId, claimed_at AS claimedAt
      FROM reward_claims
      WHERE reward_id = ? AND supporter_id = ?
    `);

    return statement.get(rewardId, supporterId) || null;
  },

  async findBySupporterAndCreator(supporterId, creatorId) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "reward_claims",
        columns: "id, reward_id, supporter_id, creator_id, claimed_at",
        filters: { supporter_id: supporterId, creator_id: creatorId },
      });

      return rows.map((row) => ({
        id: row.id,
        rewardId: row.reward_id,
        supporterId: row.supporter_id,
        creatorId: row.creator_id,
        claimedAt: row.claimed_at,
      }));
    }

    const statement = db.prepare(`
      SELECT
        id, reward_id AS rewardId, supporter_id AS supporterId,
        creator_id AS creatorId, claimed_at AS claimedAt
      FROM reward_claims
      WHERE supporter_id = ? AND creator_id = ?
    `);

    return statement.all(supporterId, creatorId);
  },
};
