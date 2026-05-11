const PLATFORM_PATTERNS = {
  youtube: /(?:^|\.)youtube\.com$|^youtu\.be$/i,
  instagram: /(?:^|\.)instagram\.com$/i,
  x: /(?:^|\.)x\.com$|(?:^|\.)twitter\.com$/i,
};

export function classifyUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return {
      category: "unknown",
      platform: "unknown",
      normalizedUrl: null,
      contentType: null,
    };
  }

  const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const normalizedUrl = parsed.toString();

  if (PLATFORM_PATTERNS.youtube.test(hostname)) {
    return {
      category: "creator_content",
      platform: "youtube",
      normalizedUrl,
      contentType: detectYouTubeContentType(parsed),
    };
  }

  if (PLATFORM_PATTERNS.instagram.test(hostname)) {
    return {
      category: "creator_content",
      platform: "instagram",
      normalizedUrl,
      contentType: "post",
    };
  }

  if (PLATFORM_PATTERNS.x.test(hostname)) {
    return {
      category: "creator_content",
      platform: "x",
      normalizedUrl,
      contentType: "post",
    };
  }

  return {
    category: "unknown",
    platform: "unknown",
    normalizedUrl,
    contentType: null,
  };
}

function detectYouTubeContentType(parsedUrl) {
  if (parsedUrl.pathname.startsWith("/watch") && parsedUrl.searchParams.has("v")) {
    return "video";
  }

  if (parsedUrl.pathname.startsWith("/shorts/")) {
    return "short";
  }

  if (parsedUrl.pathname.startsWith("/playlist")) {
    return "playlist";
  }

  if (parsedUrl.pathname.startsWith("/@") || parsedUrl.pathname.startsWith("/channel/")) {
    return "channel";
  }

  return "video";
}
