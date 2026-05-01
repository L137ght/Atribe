import { db } from "../db/database.js";

export const clickWeightSnapshotRepository = {
  create({ id, clickId, userId, snapshotJson }) {
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

  findById(id) {
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
