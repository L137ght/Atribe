import { fetchProviderJson, firstText, normalizeLimit } from "./shared.js";

export async function fetchTikTokContent({ credentials, limit = 6 }) {
  const maxResults = normalizeLimit(limit);
  const url = new URL("https://open.tiktokapis.com/v2/video/list/");
  url.searchParams.set("fields", "id,title,cover_image_url,share_url,create_time");

  const payload = await fetchProviderJson(url, credentials);
  return (payload.data?.videos || [])
    .slice(0, maxResults)
    .map((item) => ({
      providerContentId: String(item.id),
      title: firstText(item.title),
      caption: firstText(item.title),
      thumbnailUrl: item.cover_image_url || "",
      contentUrl: item.share_url,
      publishedAt: item.create_time ? new Date(Number(item.create_time) * 1000).toISOString() : null,
      rawPayload: item
    }));
}
