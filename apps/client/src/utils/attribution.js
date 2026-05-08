const AMAZON_HOST_PATTERN = /(^|\.)amazon\.[a-z.]+$/i;
const REWRITE_BLOCKED_PATHS = ["/checkout", "/cart", "/pay"];

function isAmazonUrl(url) {
  return AMAZON_HOST_PATTERN.test(url.hostname);
}

export function normalizeDomain(value) {
  return value.replace(/^www\./i, "").toLowerCase();
}

export function getDomainFromUrl(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    return normalizeDomain(parsedUrl.hostname);
  } catch (error) {
    return "";
  }
}

function shouldRewriteAmazonPath(pathname) {
  const normalizedPath = pathname.toLowerCase();

  return !REWRITE_BLOCKED_PATHS.some((blockedPath) =>
    normalizedPath.includes(blockedPath)
  );
}

export function extractTag(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    return parsedUrl.searchParams.get("tag") || "";
  } catch (error) {
    return "";
  }
}

export function normalizeAffiliateInput(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error("Enter an affiliate link or tag.");
  }

  const extractedTag = extractTag(trimmedValue);
  const nextTag = extractedTag || trimmedValue;

  if (!nextTag) {
    throw new Error("Unable to find a valid affiliate tag.");
  }

  return nextTag;
}

export function rewriteAmazonUrl(inputUrl, affiliateTag) {
  const trimmedUrl = inputUrl.trim();
  const trimmedTag = affiliateTag.trim();

  if (!trimmedUrl) {
    throw new Error("Enter an Amazon URL.");
  }

  if (!trimmedTag) {
    throw new Error("Affiliate tag is missing.");
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(trimmedUrl);
  } catch (error) {
    throw new Error("Enter a valid URL, including https://");
  }

  if (!isAmazonUrl(parsedUrl)) {
    throw new Error("Use an Amazon URL from any supported country domain.");
  }

  if (!shouldRewriteAmazonPath(parsedUrl.pathname)) {
    return parsedUrl.toString();
  }

  parsedUrl.searchParams.delete("tag");
  parsedUrl.searchParams.set("tag", trimmedTag);

  return parsedUrl.toString();
}

export function creatorSupportsDomain(creator, domain) {
  if (!domain || !creator) {
    return false;
  }

  const normalizedDomain = normalizeDomain(domain);

  if (
    creator.links?.some((link) => normalizeDomain(link.domain) === normalizedDomain)
  ) {
    return true;
  }

  return AMAZON_HOST_PATTERN.test(normalizedDomain) && Boolean(creator.affiliateTag);
}

function rewriteUrlFromAffiliateLink(inputUrl, affiliateUrl) {
  const destinationUrl = new URL(inputUrl.trim());
  const sourceUrl = new URL(affiliateUrl.trim());

  sourceUrl.searchParams.forEach((value, key) => {
    destinationUrl.searchParams.set(key, value);
  });

  return destinationUrl.toString();
}

export function rewriteUrlForCreator(inputUrl, creator) {
  const domain = getDomainFromUrl(inputUrl);

  if (!domain) {
    throw new Error("Enter a valid destination URL, including https://");
  }

  const matchingLink = creator.links?.find(
    (link) => normalizeDomain(link.domain) === normalizeDomain(domain)
  );

  if (matchingLink?.url) {
    return rewriteUrlFromAffiliateLink(inputUrl, matchingLink.url);
  }

  if (AMAZON_HOST_PATTERN.test(domain) && creator.affiliateTag) {
    return rewriteAmazonUrl(inputUrl, creator.affiliateTag);
  }

  throw new Error("This creator does not support the selected domain yet.");
}

export function getCreatorsForDomain(creators, domain) {
  return creators.filter((creator) => creatorSupportsDomain(creator, domain));
}

export function pickCreatorByWeight(creators, preferences, domain, options = {}) {
  const distributionMode = options.distributionMode === "even" ? "even" : "weighted";
  const weightedCreators = preferences
    .filter((preference) => preference.selected)
    .map((preference) => {
      const creator = creators.find((item) => item.id === preference.creatorId);

      if (!creator) {
        return null;
      }

       if (domain && !creatorSupportsDomain(creator, domain)) {
        return null;
      }

      return {
        ...creator,
        weight:
          distributionMode === "even"
            ? 1
            : Math.max(1, Number(preference.weight) || 1)
      };
    })
    .filter(Boolean);

  if (!weightedCreators.length) {
    throw new Error(
      domain
        ? "No selected creators currently support this domain."
        : "Select at least one creator first."
    );
  }

  const totalWeight = weightedCreators.reduce(
    (sum, creator) => sum + creator.weight,
    0
  );

  let cursor = Math.random() * totalWeight;

  for (const creator of weightedCreators) {
    cursor -= creator.weight;

    if (cursor <= 0) {
      return creator;
    }
  }

  return weightedCreators[weightedCreators.length - 1];
}
