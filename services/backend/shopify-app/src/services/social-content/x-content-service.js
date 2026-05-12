import { fetchProviderJson, firstText, normalizeLimit } from "./shared.js";

export async function fetchXContent({ account, credentials, limit = 6 }) {
  const maxResults = normalizeLimit(limit);
  const userId = account?.providerAccountId || account?.externalAccountId;

  if (!userId) {
    return [];
  }

  const url = new URL(`https://api.x.com/2/users/${encodeURIComponent(userId)}/tweets`);
  url.searchParams.set("max_results", String(Math.max(5, maxResults)));
  url.searchParams.set("tweet.fields", "created_at,text,entities");

  const payload = await fetchProviderJson(url, credentials);
  return (payload.data || []).slice(0, maxResults).map((item) => ({
    providerContentId: String(item.id),
    title: firstText(item.text).slice(0, 90),
    caption: firstText(item.text),
    thumbnailUrl: "",
    contentUrl: `https://x.com/${encodeURIComponent(account?.providerUsername || account?.username || "i")}/status/${encodeURIComponent(item.id)}`,
    publishedAt: item.created_at || null,
    rawPayload: item
  }));
}
