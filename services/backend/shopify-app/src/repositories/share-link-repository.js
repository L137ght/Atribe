import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchOne, insertRow } from "./supabase/shared.js";

export const shareLinkRepository = {
  async create({
    id,
    shortCode,
    supporterId,
    creatorId,
    originalUrl,
    normalizedUrl,
    platform,
    title,
    contentType,
    ownerIpHash,
    ownerUserAgentHash,
    ownerFingerprintHash,
  }) {
    if (env.dbProvider === "supabase") {
      await insertRow("share_links", {
        id,
        short_code: shortCode,
        supporter_id: supporterId,
        creator_id: creatorId,
        original_url: originalUrl,
        normalized_url: normalizedUrl || null,
        platform: platform || null,
        title: title || null,
        content_type: contentType || null,
        click_count: 0,
        owner_ip_hash: ownerIpHash || null,
        owner_user_agent_hash: ownerUserAgentHash || null,
        owner_fingerprint_hash: ownerFingerprintHash || null,
        created_at: new Date().toISOString(),
      });

      return this.findByShortCode(shortCode);
    }

    const statement = db.prepare(`
      INSERT INTO share_links (
        id, short_code, supporter_id, creator_id, original_url, normalized_url,
        platform, title, content_type, click_count, owner_ip_hash,
        owner_user_agent_hash, owner_fingerprint_hash, created_at
      )
      VALUES (
        @id, @shortCode, @supporterId, @creatorId, @originalUrl, @normalizedUrl,
        @platform, @title, @contentType, 0, @ownerIpHash,
        @ownerUserAgentHash, @ownerFingerprintHash, @createdAt
      )
    `);

    statement.run({
      id,
      shortCode,
      supporterId,
      creatorId,
      originalUrl,
      normalizedUrl: normalizedUrl || null,
      platform: platform || null,
      title: title || null,
      contentType: contentType || null,
      ownerIpHash: ownerIpHash || null,
      ownerUserAgentHash: ownerUserAgentHash || null,
      ownerFingerprintHash: ownerFingerprintHash || null,
      createdAt: new Date().toISOString(),
    });

    return this.findByShortCode(shortCode);
  },

  async findByShortCode(shortCode) {
    if (env.dbProvider === "supabase") {
      const row = await fetchOne(
        "share_links",
        "id, short_code, supporter_id, creator_id, original_url, normalized_url, platform, title, content_type, click_count, owner_ip_hash, owner_user_agent_hash, owner_fingerprint_hash, created_at, last_clicked_at",
        { short_code: shortCode }
      );

      if (!row) return null;

      return {
        id: row.id,
        shortCode: row.short_code,
        supporterId: row.supporter_id,
        creatorId: row.creator_id,
        originalUrl: row.original_url,
        normalizedUrl: row.normalized_url,
        platform: row.platform,
        title: row.title,
        contentType: row.content_type,
        clickCount: row.click_count,
        ownerIpHash: row.owner_ip_hash,
        ownerUserAgentHash: row.owner_user_agent_hash,
        ownerFingerprintHash: row.owner_fingerprint_hash,
        createdAt: row.created_at,
        lastClickedAt: row.last_clicked_at,
      };
    }

    const statement = db.prepare(`
      SELECT
        id, short_code AS shortCode, supporter_id AS supporterId, creator_id AS creatorId,
        original_url AS originalUrl, normalized_url AS normalizedUrl, platform,
        title, content_type AS contentType, click_count AS clickCount,
        owner_ip_hash AS ownerIpHash, owner_user_agent_hash AS ownerUserAgentHash,
        owner_fingerprint_hash AS ownerFingerprintHash, created_at AS createdAt,
        last_clicked_at AS lastClickedAt
      FROM share_links
      WHERE short_code = ?
    `);

    return statement.get(shortCode) || null;
  },

  async incrementClickCount(shareLinkId) {
    const now = new Date().toISOString();

    if (env.dbProvider === "supabase") {
      const supabase = getSupabase();
      const { data: current } = await supabase
        .from("share_links")
        .select("click_count")
        .eq("id", shareLinkId)
        .single();

      const nextCount = (current?.click_count ?? 0) + 1;

      const { error } = await supabase
        .from("share_links")
        .update({ click_count: nextCount, last_clicked_at: now })
        .eq("id", shareLinkId);

      if (error) {
        throw new Error(`Supabase update failed for share_links: ${error.message}`);
      }

      return;
    }

    const statement = db.prepare(`
      UPDATE share_links
      SET click_count = click_count + 1, last_clicked_at = @now
      WHERE id = @shareLinkId
    `);

    statement.run({ now, shareLinkId });
  },
};
