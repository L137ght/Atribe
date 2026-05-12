function normalizeHandle(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function normalizeId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function buildCreatorProfileUrl(creator) {
  const handle = normalizeHandle(
    creator?.handle ||
      creator?.username ||
      creator?.profileHandle ||
      creator?.publicHandle ||
      creator?.slug
  );

  if (handle) {
    return `https://atribe.io/@${handle}`;
  }

  const id = normalizeId(creator?.id || creator?.userId);
  return id ? `https://atribe.io/creators/${id}` : "https://atribe.io";
}

export function buildCreatorBioUrl(creator, baseUrl = "https://atribe.io") {
  const origin = String(baseUrl || "https://atribe.io").replace(/\/+$/, "");
  const id = normalizeId(creator?.id || creator?.creatorId || creator?.userId);

  return id ? `${origin}/c/${id}` : origin;
}
