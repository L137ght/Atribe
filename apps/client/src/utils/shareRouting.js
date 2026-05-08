import {
  getDomainFromUrl,
  pickCreatorByWeight,
  rewriteAmazonUrl,
  rewriteUrlForCreator
} from "./attribution";

const PROTECTED_PATH_SEGMENTS = ["/checkout", "/cart", "/pay", "/payment"];

export function extractDomain(url) {
  return getDomainFromUrl(url);
}

export function shouldModifyUrl(url) {
  try {
    const parsedUrl = new URL(url.trim());
    const normalizedPath = parsedUrl.pathname.toLowerCase();

    return !PROTECTED_PATH_SEGMENTS.some((segment) =>
      normalizedPath.includes(segment)
    );
  } catch (error) {
    return false;
  }
}

export function updateAmazonURL(url, tag) {
  return rewriteAmazonUrl(url, tag);
}

export function routeUrlForUser(url, userId, options = {}) {
  const {
    creators = [],
    distributionMode = "weighted",
    preferences = []
  } = options;
  const originalUrl = url?.trim?.() || "";
  const domain = extractDomain(originalUrl);

  if (!originalUrl || !domain) {
    return {
      status: "unsupported",
      reason: "invalid-url",
      originalUrl,
      domain: ""
    };
  }

  const selectedCreators = preferences.filter((preference) => preference.selected);

  if (!selectedCreators.length) {
    return {
      status: "missing-creators",
      reason: "no-creators",
      originalUrl,
      domain,
      userId
    };
  }

  if (!shouldModifyUrl(originalUrl)) {
    return {
      status: "ready",
      reason: "protected-path",
      originalUrl,
      routedUrl: originalUrl,
      domain,
      userId,
      selectedCreator: null
    };
  }

  try {
    const selectedCreator = pickCreatorByWeight(creators, preferences, domain, {
      distributionMode
    });
    const routedUrl = rewriteUrlForCreator(originalUrl, selectedCreator);

    return {
      status: "ready",
      reason: "routed",
      originalUrl,
      routedUrl,
      domain,
      userId,
      selectedCreator
    };
  } catch (error) {
    if (error.message === "Select at least one creator first.") {
      return {
        status: "missing-creators",
        reason: "no-creators",
        originalUrl,
        domain,
        userId
      };
    }

    if (error.message === "No selected creators currently support this domain.") {
      return {
        status: "unsupported",
        reason: "unsupported-domain",
        originalUrl,
        domain,
        userId
      };
    }

    return {
      status: "unsupported",
      reason: "routing-error",
      errorMessage: error.message,
      originalUrl,
      domain,
      userId
    };
  }
}
