import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchOne } from "./supabase/shared.js";

const extractAmazonTag = (links = []) => {
  const amazonLink = links.find((link) => String(link.domain || "").toLowerCase().includes("amazon."));
  const affiliateUrl = amazonLink?.affiliate_url || amazonLink?.url;
  if (!affiliateUrl) {
    return null;
  }

  try {
    const parsed = new URL(affiliateUrl);
    return parsed.searchParams.get("tag") || null;
  } catch {
    return null;
  }
};

const toJsonValue = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const mapSupabaseCreator = (row) =>
  row
    ? {
        id: row.id,
        userId: row.user_id || null,
        name: row.display_name || row.name || null,
        externalTagsJson:
          row.external_tags_json && typeof row.external_tags_json === "object"
            ? JSON.stringify(row.external_tags_json)
            : row.external_tags_json || null,
        createdAt: row.created_at,
        links: Array.isArray(row.creator_affiliate_links)
          ? row.creator_affiliate_links.map((link) => ({
              id: link.id,
              domain: link.domain,
              url: link.affiliate_url || link.url,
              isActive: link.is_active
            }))
          : [],
        affiliateTag: extractAmazonTag(row.creator_affiliate_links || [])
      }
    : null;

export const creatorRepository = {
  async findById(creatorId) {
    if (env.dbProvider === "supabase") {
      const supabase = getSupabase();

      try {
        const { data, error } = await supabase
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

        if (data) {
          return mapSupabaseCreator(data);
        }
      } catch {}

      try {
        const { data, error } = await supabase
          .from("shopify_creators")
          .select(`
            id,
            user_id,
            name,
            external_tags_json,
            created_at,
            shopify_creator_affiliate_links (
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

        if (data) {
          return mapSupabaseCreator({
            ...data,
            creator_affiliate_links: data.shopify_creator_affiliate_links || []
          });
        }
      } catch {
        return null;
      }

      return null;
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
      const supabase = getSupabase();
      const existing = await this.findById(id);
      const payload = {
        id,
        user_id: existing?.userId || null,
        name: name ?? existing?.name ?? null,
        external_tags_json: toJsonValue(externalTagsJson) ?? toJsonValue(existing?.externalTagsJson),
        created_at: existing?.createdAt || new Date().toISOString()
      };

      const { error } = await supabase
        .from("shopify_creators")
        .upsert(payload, {
          onConflict: "id",
          ignoreDuplicates: false
        });

      if (error) {
        throw new Error(`Supabase upsert failed for shopify_creators: ${error.message}`);
      }

      return this.findById(id);
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
