import { db } from "../db/database.js";

export const userRepository = {
  findById(userId) {
    const statement = db.prepare(`
      SELECT id, email, created_at AS createdAt
      FROM users
      WHERE id = ?
    `);

    return statement.get(userId) || null;
  },

  upsert({ id, email = null }) {
    const statement = db.prepare(`
      INSERT INTO users (id, email, created_at)
      VALUES (@id, @email, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email
    `);

    statement.run({
      id,
      email,
      createdAt: new Date().toISOString()
    });
  }
};
