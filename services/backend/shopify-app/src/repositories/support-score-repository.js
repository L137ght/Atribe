import crypto from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchOne, fetchMany, insertRow } from "./supabase/shared.js";

export const supportScoreRepository = {
  async findBySupporterAndCreator(supporterId, creatorId) {
    if (env.dbProvider === "supabase") {
      const row = await fetchOne(
        "support_scores",
        "id, supporter_id, creator_id, lifetime_points, monthly_points, last_action_at, created_at, updated_at",
        { supporter_id: supporterId, creator_id: creatorId }
      );

      if (!row) return null;

      return {
        id: row.id,
        supporterId: row.supporter_id,
        creatorId: row.creator_id,
        lifetimePoints: row.lifetime_points,
        monthlyPoints: row.monthly_points,
        lastActionAt: row.last_action_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }

    const statement = db.prepare(`
      SELECT
        id, supporter_id AS supporterId, creator_id AS creatorId,
        lifetime_points AS lifetimePoints, monthly_points AS monthlyPoints,
        last_action_at AS lastActionAt, created_at AS createdAt, updated_at AS updatedAt
      FROM support_scores
      WHERE supporter_id = ? AND creator_id = ?
    `);

    return statement.get(supporterId, creatorId) || null;
  },

  async findBySupporter(supporterId) {
    if (env.dbProvider === "supabase") {
      const rows = await fetchMany({
        tableName: "support_scores",
        columns: "id, supporter_id, creator_id, lifetime_points, monthly_points, last_action_at, created_at, updated_at",
        filters: { supporter_id: supporterId },
        orderBy: "lifetime_points",
        ascending: false,
      });

      return rows.map((row) => ({
        id: row.id,
        supporterId: row.supporter_id,
        creatorId: row.creator_id,
        lifetimePoints: row.lifetime_points,
        monthlyPoints: row.monthly_points,
        lastActionAt: row.last_action_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }

    const statement = db.prepare(`
      SELECT
        id, supporter_id AS supporterId, creator_id AS creatorId,
        lifetime_points AS lifetimePoints, monthly_points AS monthlyPoints,
        last_action_at AS lastActionAt, created_at AS createdAt, updated_at AS updatedAt
      FROM support_scores
      WHERE supporter_id = ?
      ORDER BY lifetime_points DESC
    `);

    return statement.all(supporterId);
  },

  async incrementPoints(supporterId, creatorId, points) {
    const existing = await this.findBySupporterAndCreator(supporterId, creatorId);
    const now = new Date().toISOString();

    if (env.dbProvider === "supabase") {
      if (existing) {
        const supabase = getSupabase();
        const { error } = await supabase
          .from("support_scores")
          .update({
            lifetime_points: existing.lifetimePoints + points,
            monthly_points: existing.monthlyPoints + points,
            last_action_at: now,
            updated_at: now,
          })
          .eq("id", existing.id);

        if (error) {
          throw new Error(`Supabase update failed for support_scores: ${error.message}`);
        }
      } else {
        await insertRow("support_scores", {
          supporter_id: supporterId,
          creator_id: creatorId,
          lifetime_points: points,
          monthly_points: points,
          last_action_at: now,
          created_at: now,
          updated_at: now,
        });
      }
      return;
    }

    if (existing) {
      const statement = db.prepare(`
        UPDATE support_scores
        SET lifetime_points = lifetime_points + @points,
            monthly_points = monthly_points + @points,
            last_action_at = @now,
            updated_at = @now
        WHERE supporter_id = @supporterId AND creator_id = @creatorId
      `);

      statement.run({ points, now, supporterId, creatorId });
    } else {
      const id = crypto.randomUUID();
      const statement = db.prepare(`
        INSERT INTO support_scores (id, supporter_id, creator_id, lifetime_points, monthly_points, last_action_at, created_at, updated_at)
        VALUES (@id, @supporterId, @creatorId, @points, @points, @now, @now, @now)
      `);

      statement.run({ id, supporterId, creatorId, points, now });
    }
  },
};
