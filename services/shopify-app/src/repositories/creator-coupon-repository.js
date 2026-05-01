import { db } from "../db/database.js";

export const creatorCouponRepository = {
  upsert({ couponCode, creatorId }) {
    const statement = db.prepare(`
      INSERT INTO creator_coupon_mappings (coupon_code, creator_id, created_at)
      VALUES (@couponCode, @creatorId, @createdAt)
      ON CONFLICT(coupon_code) DO UPDATE SET
        creator_id = excluded.creator_id,
        created_at = excluded.created_at
    `);

    statement.run({
      couponCode,
      creatorId,
      createdAt: new Date().toISOString()
    });
  },

  findByCouponCode(couponCode) {
    const statement = db.prepare(`
      SELECT coupon_code AS couponCode, creator_id AS creatorId, created_at AS createdAt
      FROM creator_coupon_mappings
      WHERE coupon_code = ?
    `);

    return statement.get(couponCode) || null;
  }
};
