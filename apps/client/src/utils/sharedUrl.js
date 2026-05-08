const SHARED_URL_PATTERN = /\bhttps?:\/\/[^\s<>"')\]]+/gi;

function trimTrailingPunctuation(value) {
  return value.replace(/[),.;!?]+$/g, "");
}

export function validateSharedUrl(value) {
  const trimmedValue = value?.trim?.() || "";

  if (!trimmedValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    if (!/^https?:$/i.test(parsedUrl.protocol)) {
      return null;
    }

    return parsedUrl.toString();
  } catch (error) {
    return null;
  }
}

export function extractFirstValidUrl(sharedValue) {
  if (!sharedValue) {
    return null;
  }

  const normalizedInput = Array.isArray(sharedValue)
    ? sharedValue.filter(Boolean).join(" ")
    : String(sharedValue);
  const exactUrl = validateSharedUrl(normalizedInput);

  if (exactUrl) {
    return exactUrl;
  }

  const matches = normalizedInput.match(SHARED_URL_PATTERN) || [];

  for (const match of matches) {
    const candidateUrl = validateSharedUrl(trimTrailingPunctuation(match));

    if (candidateUrl) {
      return candidateUrl;
    }
  }

  return null;
}

export function extractDeepLinkShareUrl(incomingUrl) {
  if (!incomingUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(incomingUrl);

    if (parsedUrl.protocol !== "atribe:" || parsedUrl.hostname !== "share") {
      return null;
    }

    return validateSharedUrl(parsedUrl.searchParams.get("url"));
  } catch (error) {
    return null;
  }
}

export function buildShareRouteParams({ sharedText, sharedUrl, source }) {
  const extractedUrl =
    validateSharedUrl(sharedUrl) ||
    extractFirstValidUrl(sharedText);

  return {
    sharedText: sharedText || "",
    source: source || "share-intent",
    url: extractedUrl || "",
    unsupported: !Boolean(extractedUrl)
  };
}
