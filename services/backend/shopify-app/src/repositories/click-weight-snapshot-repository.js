import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { fetchOne, insertRow } from "./supabase/shared.js";

export const clickWeightSnapshotRepository = {
  async create({ id, clickId, userId, snapshotJson }) {
    if (env.dbProvider === "supabase") {
      await insertRow("shopify_click_weight_snapshots", {
        id,
        click_id: clickId,
        user_id: userId,
        snapshot_json: typeof snapshotJson === "string" ? JSON.parse(snapshotJson) : snapshotJson,
        created_at: new Date().toISOString()
      });
      return;
    }

    const statement = db.prepare(`
      INSERT INTO click_weight_snapshots (id, click_id, user_id, snapshot_json, created_at)
      VALUES (@id, @clickId, @userId, @snapshotJson, @createdAt)
    `);

    statement.run({
      id,
      clickId,
      userId,
      snapshotJson,
      createdAt: new Date().toISOString()
    });
  },

  async findById(id) {
    if (env.dbProvider === "supabase") {
      const row = await fetchOne(
        "shopify_click_weight_snapshots",
        "id, click_id, user_id, snapshot_json, created_at",
        { id }
      );

      return row
        ? {
            id: row.id,
            clickId: row.click_id,
            userId: row.user_id,
            snapshotJson: JSON.stringify(row.snapshot_json),
            createdAt: row.created_at
          }
        : null;
    }

    const statement = db.prepare(`
      SELECT
        id,
        click_id AS clickId,
        user_id AS userId,
        snapshot_json AS snapshotJson,
        created_at AS createdAt
      FROM click_weight_snapshots
      WHERE id = ?
    `);

    return statement.get(id) || null;
  }
};
