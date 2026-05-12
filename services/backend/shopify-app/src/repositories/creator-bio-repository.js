import { randomUUID } from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";

const AUTO_CONTENT_PLATFORMS = new Set(["instagram", "youtube", "tiktok", "x"]);

const parseJson = (value, fallback) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeText = (value) => String(value || "").trim();

const mapSocialAccount = (row) => ({
  id: row.id,
  creatorProfileId: row.creator_profile_id || row.creatorProfileId,
  platform: row.platform,
  username: row.username || row.provider_username || row.providerUsername || "",
  providerAccountId: row.provider_account_id || row.providerAccountId || row.external_account_id || null,
  providerUsername: row.provider_username || row.providerUsername || row.username || "",
  providerDisplayName: row.provider_display_name || row.providerDisplayName || null,
  providerAvatarUrl: row.provider_avatar_url || row.providerAvatarUrl || null,
  status: row.status || "connected",
  grantedPermissions: parseJson(row.granted_permissions || row.granted_permissions_json || row.grantedPermissionsJson, []),
  grantedScopes: parseJson(row.granted_scopes || row.granted_scopes_json || row.grantedScopesJson, []),
  profileData: parseJson(row.profile_data || row.profile_data_json || row.profileDataJson, {}),
  tokenExpiresAt: row.token_expires_at || row.tokenExpiresAt || null,
  lastConnectedAt: row.last_connected_at || row.lastConnectedAt || null,
  lastSyncedAt: row.last_synced_at || row.lastSyncedAt || null,
  automaticContentSupported: AUTO_CONTENT_PLATFORMS.has(row.platform)
});

const mapManualLink = (row) => ({
  id: row.id,
  label: row.label,
  url: row.url,
  icon: row.icon || null,
  category: row.category || null,
  sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
  isEnabled: Boolean(row.is_enabled ?? row.isEnabled)
});

const mapContentItem = (row) => ({
  id: row.id,
  platform: row.platform,
  title: row.title || "",
  caption: row.caption || "",
  thumbnailUrl: row.thumbnail_url || row.thumbnailUrl || "",
  contentUrl: row.content_url || row.contentUrl,
  publishedAt: row.published_at || row.publishedAt || null
});

const mapBioPage = ({ page, creator, platforms = [], manualLinks = [], contentItems = [] }) => {
  if (!page || !creator) {
    return null;
  }

  const socialAccountsById = new Map(platforms.map((platform) => [platform.socialAccount.id, platform.socialAccount]));
  const content = contentItems
    .filter((item) => socialAccountsById.has(item.creatorSocialAccountId || item.creator_social_account_id))
    .map((item) => mapContentItem(item))
    .filter((item) => item.contentUrl);

  return {
    id: page.id,
    creatorId: page.creator_id || page.creatorId,
    slug: page.slug || null,
    isPublished: Boolean(page.is_published ?? page.isPublished),
    headline: page.headline || "",
    bio: page.bio || creator.bio || "",
    theme: parseJson(page.theme || page.theme_json || page.themeJson, {}),
    publicPath: `/c/${encodeURIComponent(page.creator_id || page.creatorId)}`,
    creator: {
      id: creator.id,
      displayName: creator.display_name || creator.name || "Atribe creator",
      handle: page.slug ? `@${page.slug}` : "",
      avatarUrl: creator.avatar_url || creator.avatarUrl || "",
      bio: creator.bio || ""
    },
    platforms: platforms.map((platform) => ({
      id: platform.id,
      isEnabled: platform.isEnabled,
      sortOrder: platform.sortOrder,
      socialAccount: platform.socialAccount
    })),
    latestContent: content,
    manualLinks: manualLinks.filter((link) => link.isEnabled)
  };
};

const selectSupabaseBioPage = `
  id,
  creator_id,
  slug,
  is_published,
  headline,
  bio,
  theme,
  created_at,
  updated_at,
  creator_profiles (
    id,
    display_name,
    bio,
    user_id,
    profiles (
      avatar_url
    )
  ),
  creator_bio_manual_links (
    id,
    label,
    url,
    icon,
    category,
    sort_order,
    is_enabled
  ),
  creator_bio_platforms (
    id,
    is_enabled,
    sort_order,
    creator_social_accounts (
      id,
      creator_profile_id,
      platform,
      username,
      external_account_id,
      provider_account_id,
      provider_username,
      provider_display_name,
      provider_avatar_url,
      status,
      granted_permissions,
      granted_scopes,
      profile_data,
      token_expires_at,
      last_connected_at,
      last_synced_at
    )
  )
`;

const mapSupabasePage = async (page) => {
  if (!page) {
    return null;
  }

  const platforms = (page.creator_bio_platforms || [])
    .filter((row) => row.creator_social_accounts)
    .map((row) => ({
      id: row.id,
      isEnabled: Boolean(row.is_enabled),
      sortOrder: Number(row.sort_order || 0),
      socialAccount: mapSocialAccount(row.creator_social_accounts)
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const enabledAccountIds = platforms
    .filter((platform) => platform.isEnabled)
    .map((platform) => platform.socialAccount.id);

  let contentItems = [];
  if (enabledAccountIds.length > 0) {
    const { data, error } = await getSupabase()
      .from("creator_social_content_items")
      .select("id, creator_social_account_id, platform, title, caption, thumbnail_url, content_url, published_at")
      .in("creator_social_account_id", enabledAccountIds)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(12);

    if (error) {
      throw new Error(`Failed to load creator social content: ${error.message}`);
    }

    contentItems = data || [];
  }

  return mapBioPage({
    page,
    creator: {
      ...page.creator_profiles,
      avatar_url: page.creator_profiles?.profiles?.avatar_url || ""
    },
    platforms,
    manualLinks: (page.creator_bio_manual_links || [])
      .map(mapManualLink)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    contentItems
  });
};

const findSupabasePage = async (identifier) => {
  const supabase = getSupabase();
  const normalized = normalizeText(identifier);

  let query = supabase.from("creator_bio_pages").select(selectSupabaseBioPage);
  if (/^[0-9a-f-]{36}$/i.test(normalized)) {
    query = query.eq("creator_id", normalized);
  } else {
    query = query.eq("slug", normalized.replace(/^@/, ""));
  }

  const { data, error } = await query.eq("is_published", true).maybeSingle();
  if (error) {
    throw new Error(`Failed to load creator bio page: ${error.message}`);
  }

  return mapSupabasePage(data);
};

const findSqlitePage = async (identifier) => {
  const normalized = normalizeText(identifier);
  const page = db
    .prepare(
      `
        SELECT *
        FROM creator_bio_pages
        WHERE is_published = 1
          AND (creator_id = ? OR slug = ?)
        LIMIT 1
      `
    )
    .get(normalized, normalized.replace(/^@/, ""));

  if (!page) {
    return null;
  }

  const creator =
    db.prepare("SELECT id, name FROM creators WHERE id = ?").get(page.creator_id) || {
      id: page.creator_id,
      name: "Atribe creator"
    };

  const platformRows = db
    .prepare(
      `
        SELECT
          cbp.id,
          cbp.is_enabled AS isEnabled,
          cbp.sort_order AS sortOrder,
          csa.*
        FROM creator_bio_platforms cbp
        JOIN creator_social_accounts csa ON csa.id = cbp.creator_social_account_id
        WHERE cbp.creator_bio_page_id = ?
        ORDER BY cbp.sort_order ASC
      `
    )
    .all(page.id);

  const platforms = platformRows.map((row) => ({
    id: row.id,
    isEnabled: Boolean(row.isEnabled),
    sortOrder: Number(row.sortOrder || 0),
    socialAccount: mapSocialAccount(row)
  }));

  const manualLinks = db
    .prepare(
      `
        SELECT *
        FROM creator_bio_manual_links
        WHERE creator_bio_page_id = ? AND is_enabled = 1
        ORDER BY sort_order ASC, created_at ASC
      `
    )
    .all(page.id)
    .map(mapManualLink);

  const enabledAccountIds = platforms
    .filter((platform) => platform.isEnabled)
    .map((platform) => platform.socialAccount.id);
  const contentItems =
    enabledAccountIds.length === 0
      ? []
      : db
          .prepare(
            `
              SELECT *
              FROM creator_social_content_items
              WHERE creator_social_account_id IN (${enabledAccountIds.map(() => "?").join(",")})
              ORDER BY published_at DESC
              LIMIT 12
            `
          )
          .all(...enabledAccountIds);

  return mapBioPage({
    page,
    creator,
    platforms,
    manualLinks,
    contentItems
  });
};

export const creatorBioRepository = {
  async findPublicByIdentifier(identifier) {
    if (!normalizeText(identifier)) {
      return null;
    }

    if (env.dbProvider === "supabase") {
      return findSupabasePage(identifier);
    }

    return findSqlitePage(identifier);
  },

  async findSyncableSocialAccountsByCreatorId(creatorId) {
    const normalizedCreatorId = normalizeText(creatorId);
    if (!normalizedCreatorId) {
      return [];
    }

    if (env.dbProvider === "supabase") {
      const { data, error } = await getSupabase()
        .from("creator_social_accounts")
        .select(
          `
            id,
            creator_profile_id,
            platform,
            username,
            external_account_id,
            provider_account_id,
            provider_username,
            provider_display_name,
            provider_avatar_url,
            status,
            granted_permissions,
            granted_scopes,
            profile_data,
            token_expires_at,
            last_connected_at,
            last_synced_at,
            creator_social_account_credentials (
              access_token,
              refresh_token,
              token_type,
              expires_at,
              scopes
            )
          `
        )
        .eq("creator_profile_id", normalizedCreatorId)
        .eq("status", "connected");

      if (error) {
        throw new Error(`Failed to load creator social accounts: ${error.message}`);
      }

      return (data || []).map((row) => ({
        account: mapSocialAccount(row),
        credentials: {
          accessToken: row.creator_social_account_credentials?.access_token || "",
          refreshToken: row.creator_social_account_credentials?.refresh_token || "",
          tokenType: row.creator_social_account_credentials?.token_type || "",
          expiresAt: row.creator_social_account_credentials?.expires_at || null,
          scopes: row.creator_social_account_credentials?.scopes || []
        }
      }));
    }

    const rows = db
      .prepare(
        `
          SELECT
            csa.*,
            csac.access_token AS accessToken,
            csac.refresh_token AS refreshToken,
            csac.token_type AS tokenType,
            csac.expires_at AS expiresAt,
            csac.scopes_json AS scopesJson
          FROM creator_social_accounts csa
          LEFT JOIN creator_social_account_credentials csac
            ON csac.creator_social_account_id = csa.id
          WHERE csa.creator_profile_id = ?
            AND csa.status = 'connected'
        `
      )
      .all(normalizedCreatorId);

    return rows.map((row) => ({
      account: mapSocialAccount(row),
      credentials: {
        accessToken: row.accessToken || "",
        refreshToken: row.refreshToken || "",
        tokenType: row.tokenType || "",
        expiresAt: row.expiresAt || null,
        scopes: parseJson(row.scopesJson, [])
      }
    }));
  },

  async markSocialAccountSynced({ socialAccountId, status = "connected" }) {
    const now = new Date().toISOString();

    if (env.dbProvider === "supabase") {
      const { error } = await getSupabase()
        .from("creator_social_accounts")
        .update({
          status,
          last_synced_at: now
        })
        .eq("id", socialAccountId);

      if (error) {
        throw new Error(`Failed to update social account sync status: ${error.message}`);
      }

      return;
    }

    db.prepare(
      `
        UPDATE creator_social_accounts
        SET status = ?, last_synced_at = ?, updated_at = ?
        WHERE id = ?
      `
    ).run(status, now, now, socialAccountId);
  },

  async upsertContentItems({ socialAccountId, platform, items }) {
    const normalizedItems = (items || []).filter((item) => item?.providerContentId && item?.contentUrl);
    if (normalizedItems.length === 0) {
      return [];
    }

    const now = new Date().toISOString();

    if (env.dbProvider === "supabase") {
      const { data, error } = await getSupabase()
        .from("creator_social_content_items")
        .upsert(
          normalizedItems.map((item) => ({
            creator_social_account_id: socialAccountId,
            provider_content_id: item.providerContentId,
            platform,
            title: item.title || null,
            caption: item.caption || null,
            thumbnail_url: item.thumbnailUrl || null,
            content_url: item.contentUrl,
            published_at: item.publishedAt || null,
            raw_payload: item.rawPayload || {}
          })),
          { onConflict: "creator_social_account_id,provider_content_id" }
        )
        .select("*");

      if (error) {
        throw new Error(`Failed to save creator social content: ${error.message}`);
      }

      return data || [];
    }

    const statement = db.prepare(`
      INSERT INTO creator_social_content_items (
        id,
        creator_social_account_id,
        provider_content_id,
        platform,
        title,
        caption,
        thumbnail_url,
        content_url,
        published_at,
        raw_payload_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(creator_social_account_id, provider_content_id)
      DO UPDATE SET
        title = excluded.title,
        caption = excluded.caption,
        thumbnail_url = excluded.thumbnail_url,
        content_url = excluded.content_url,
        published_at = excluded.published_at,
        raw_payload_json = excluded.raw_payload_json,
        updated_at = excluded.updated_at
    `);

    for (const item of normalizedItems) {
      statement.run(
        randomUUID(),
        socialAccountId,
        item.providerContentId,
        platform,
        item.title || null,
        item.caption || null,
        item.thumbnailUrl || null,
        item.contentUrl,
        item.publishedAt || null,
        JSON.stringify(item.rawPayload || {}),
        now,
        now
      );
    }

    return normalizedItems;
  }
};
