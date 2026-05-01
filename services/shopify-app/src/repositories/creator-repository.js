import { db } from "../db/database.js";

export const creatorRepository = {
  findById(creatorId) {
    const statement = db.prepare(`
      SELECT id, name, external_tags_json AS externalTagsJson, created_at AS createdAt
      FROM creators
      WHERE id = ?
    `);

    return statement.get(creatorId) || null;
  },

  upsert({ id, name = null, externalTagsJson = null }) {
    const statement = db.prepare(`
      INSERT INTO creators (id, name, external_tags_json, created_at)
      VALUES (@id, @name, @externalTagsJson, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        name = COALESCE(excluded.name, creators.name),
        external_tags_json = COALESCE(excluded.external_tags_json, creators.external_tags_json)
    `);

    statement.run({
      id,
      name,
      externalTagsJson,
      createdAt: new Date().toISOString()
    });
  }
};
