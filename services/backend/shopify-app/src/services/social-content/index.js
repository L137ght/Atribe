import { fetchInstagramContent } from "./instagram-content-service.js";
import { fetchTikTokContent } from "./tiktok-content-service.js";
import { fetchXContent } from "./x-content-service.js";
import { fetchYouTubeContent } from "./youtube-content-service.js";

export const SUPPORTED_SOCIAL_CONTENT_PLATFORMS = ["instagram", "youtube", "tiktok", "x"];

const adapters = {
  instagram: {
    platform: "instagram",
    actionLabel: "View post",
    fetchLatestContent: fetchInstagramContent
  },
  youtube: {
    platform: "youtube",
    actionLabel: "Watch video",
    fetchLatestContent: fetchYouTubeContent
  },
  tiktok: {
    platform: "tiktok",
    actionLabel: "Open on TikTok",
    fetchLatestContent: fetchTikTokContent
  },
  x: {
    platform: "x",
    actionLabel: "View post",
    fetchLatestContent: fetchXContent
  }
};

export function getSocialContentAdapter(platform) {
  return adapters[String(platform || "").toLowerCase()] || null;
}

export function isAutomaticSocialContentSupported(platform) {
  return Boolean(getSocialContentAdapter(platform));
}

export async function fetchLatestSocialContent({ account, credentials, limit = 6 }) {
  const adapter = getSocialContentAdapter(account?.platform);

  if (!adapter) {
    return {
      status: "unsupported",
      items: []
    };
  }

  if (!credentials?.accessToken && !credentials?.access_token) {
    return {
      status: "missing_credentials",
      items: []
    };
  }

  const items = await adapter.fetchLatestContent({
    account,
    credentials,
    limit
  });

  return {
    status: "synced",
    actionLabel: adapter.actionLabel,
    items
  };
}
