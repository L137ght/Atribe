import { fetchProviderJson, firstText, normalizeLimit } from "./shared.js";

export async function fetchYouTubeContent({ account, credentials, limit = 6 }) {
  const maxResults = normalizeLimit(limit);
  const channelId = account?.providerAccountId || account?.externalAccountId || "mine";
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("order", "date");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(maxResults));

  if (channelId === "mine") {
    url.searchParams.set("forMine", "true");
  } else {
    url.searchParams.set("channelId", channelId);
  }

  const payload = await fetchProviderJson(url, credentials);
  return (payload.items || []).map((item) => {
    const videoId = item.id?.videoId || item.id;
    return {
      providerContentId: String(videoId),
      title: firstText(item.snippet?.title),
      caption: firstText(item.snippet?.description),
      thumbnailUrl:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        "",
      contentUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
      publishedAt: item.snippet?.publishedAt || null,
      rawPayload: item
    };
  });
}
