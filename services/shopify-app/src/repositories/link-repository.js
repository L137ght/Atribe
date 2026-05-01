import { db } from "../db/database.js";

export const linkRepository = {
  create({ linkId, creatorId, brandId, destinationUrl }) {
    const statement = db.prepare(`
      INSERT INTO links (link_id, creator_id, brand_id, destination_url, created_at)
      VALUES (@linkId, @creatorId, @brandId, @destinationUrl, @createdAt)
    `);

    statement.run({
      linkId,
      creatorId,
      brandId,
      destinationUrl,
      createdAt: new Date().toISOString()
    });
  },

  findByCreatorAndLinkId({ creatorId, linkId }) {
    const statement = db.prepare(`
      SELECT
        link_id AS linkId,
        creator_id AS creatorId,
        brand_id AS brandId,
        destination_url AS destinationUrl,
        created_at AS createdAt
      FROM links
      WHERE creator_id = ? AND link_id = ?
    `);

    return statement.get(creatorId, linkId) || null;
  },

  findByCreatorId(creatorId) {
    const statement = db.prepare(`
      SELECT
        link_id AS linkId,
        creator_id AS creatorId,
        brand_id AS brandId,
        destination_url AS destinationUrl,
        created_at AS createdAt
      FROM links
      WHERE creator_id = ?
      ORDER BY created_at DESC
    `);

    return statement.all(creatorId);
  }
};
