import { db } from "../db/database.js";

export const userCreatorWeightRepository = {
  findActiveByUserId(userId) {
    const statement = db.prepare(`
      SELECT
        id,
        user_id AS userId,
        creator_id AS creatorId,
        weight,
        active,
        attributed_value_total AS attributedValueTotal,
        commission_value_total AS commissionValueTotal,
        event_count AS eventCount,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM user_creator_weights
      WHERE user_id = ? AND active = 1
      ORDER BY created_at ASC
    `);

    return statement.all(userId);
  },

  incrementPerformance({
    userId,
    creatorId,
    attributedValueIncrement = 0,
    commissionValueIncrement = 0,
    eventCountIncrement = 0
  }) {
    const statement = db.prepare(`
      UPDATE user_creator_weights
      SET
        attributed_value_total = attributed_value_total + @attributedValueIncrement,
        commission_value_total = commission_value_total + @commissionValueIncrement,
        event_count = event_count + @eventCountIncrement,
        updated_at = @updatedAt
      WHERE user_id = @userId AND creator_id = @creatorId
    `);

    statement.run({
      userId,
      creatorId,
      attributedValueIncrement,
      commissionValueIncrement,
      eventCountIncrement,
      updatedAt: new Date().toISOString()
    });
  },

  upsert({
    id,
    userId,
    creatorId,
    weight,
    active = true,
    attributedValueTotal = 0,
    commissionValueTotal = 0,
    eventCount = 0
  }) {
    const statement = db.prepare(`
      INSERT INTO user_creator_weights (
        id,
        user_id,
        creator_id,
        weight,
        active,
        attributed_value_total,
        commission_value_total,
        event_count,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @userId,
        @creatorId,
        @weight,
        @active,
        @attributedValueTotal,
        @commissionValueTotal,
        @eventCount,
        @createdAt,
        @updatedAt
      )
      ON CONFLICT(user_id, creator_id) DO UPDATE SET
        weight = excluded.weight,
        active = excluded.active,
        updated_at = excluded.updated_at
    `);

    const now = new Date().toISOString();
    statement.run({
      id,
      userId,
      creatorId,
      weight,
      active: active ? 1 : 0,
      attributedValueTotal,
      commissionValueTotal,
      eventCount,
      createdAt: now,
      updatedAt: now
    });
  }
};
