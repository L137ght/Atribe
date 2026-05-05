import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchOne } from "./supabase/shared.js";

const extractAmazonTag = (links = []) => {
  const amazonLink = links.find((link) => String(link.domain || "").toLowerCase().includes("amazon."));
  if (!amazonLink?.affiliate_url) {
    return null;
  }

  try {
    const parsed = new URL(amazonLink.affiliate_url);
    return parsed.searchParams.get("tag") || null;
  } catch {
    return null;
  }
};

const mapSupabaseCreator = (row) =>
  row
    ? {
        id: row.id,
        userId: row.user_id || null,
        name: row.display_name || row.name,
        externalTagsJson: row.external_tags_json || null,
        createdAt: row.created_at,
        links: Array.isArray(row.creator_affiliate_links)
          ? row.creator_affiliate_links.map((link) => ({
              id: link.id,
              domain: link.domain,
              url: link.affiliate_url,
              isActive: link.is_active
            }))
          : [],
        affiliateTag: extractAmazonTag(row.creator_affiliate_links || [])
      }
    : null;

export const creatorRepository = {
  async findById(creatorId) {
    if (env.dbProvider === "supabase") {
      try {
        const { data, error } = await getSupabase()
          .from("creator_profiles")
          .select(`
            id,
            user_id,
            display_name,
            created_at,
            creator_affiliate_links (
              id,
              domain,
              affiliate_url,
              is_active
            )
          `)
          .eq("id", creatorId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        return mapSupabaseCreator(data);
      } catch {
        return null;
      }
    }

    const statement = db.prepare(`
      SELECT id, name, external_tags_json AS externalTagsJson, created_at AS createdAt
      FROM creators
      WHERE id = ?
    `);

    return statement.get(creatorId) || null;
  },

  async upsert({ id, name = null, externalTagsJson = null }) {
    if (env.dbProvider === "supabase") {
      return (await this.findById(id)) || {
        id,
        name,
        externalTagsJson,
        createdAt: null
      };
    }

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

    return this.findById(id);
  }
};
