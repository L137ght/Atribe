import { fetchProviderJson, firstText, normalizeLimit } from "./shared.js";

export async function fetchInstagramContent({ account, credentials, limit = 6 }) {
  const maxResults = normalizeLimit(limit);
  const accountId = account?.providerAccountId || account?.externalAccountId || "me";
  const url = new URL(`https://graph.instagram.com/${encodeURIComponent(accountId)}/media`);
  url.searchParams.set("fields", "id,caption,media_url,thumbnail_url,permalink,timestamp,media_type");
  url.searchParams.set("limit", String(maxResults));

  const payload = await fetchProviderJson(url, credentials);
  return (payload.data || []).map((item) => ({
    providerContentId: String(item.id),
    title: firstText(item.caption).slice(0, 90),
    caption: firstText(item.caption),
    thumbnailUrl: item.thumbnail_url || item.media_url || "",
    contentUrl: item.permalink,
    publishedAt: item.timestamp || null,
    rawPayload: item
  }));
}
