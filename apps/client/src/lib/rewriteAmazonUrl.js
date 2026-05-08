const AMAZON_HOST_PATTERN = /(^|\.)amazon\.[a-z.]+$/i;
const FLIPKART_HOST_PATTERN = /(^|\.)flipkart\.com$/i;

function parseUrlSafely(value) {
  try {
    return new URL(String(value || "").trim());
  } catch {
    return null;
  }
}

export function isAmazonDomain(hostname) {
  return AMAZON_HOST_PATTERN.test(String(hostname || "").toLowerCase());
}

export function isFlipkartDomain(hostname) {
  return FLIPKART_HOST_PATTERN.test(String(hostname || "").toLowerCase());
}

export function isSupportedShoppingDomain(hostname) {
  return isAmazonDomain(hostname) || isFlipkartDomain(hostname);
}

function normalizeRewriteConfig(configOrTag) {
  if (typeof configOrTag === "string") {
    return {
      amazonTag: configOrTag
    };
  }

  return {
    amazonTag: configOrTag?.amazonTag || "",
    flipkartAffid: configOrTag?.flipkartAffid || ""
  };
}

function rewriteDirectAmazonUrl(url, tag) {
  const parsed = parseUrlSafely(url);

  if (!parsed || !isAmazonDomain(parsed.hostname) || !tag) {
    return String(url || "");
  }

  parsed.searchParams.set("tag", tag);
  return parsed.toString();
}

function rewriteDirectFlipkartUrl(url, affid) {
  const parsed = parseUrlSafely(url);

  if (!parsed || !isFlipkartDomain(parsed.hostname) || !affid) {
    return String(url || "");
  }

  parsed.protocol = "https:";
  parsed.hostname = "dl.flipkart.com";
  parsed.pathname = parsed.pathname.startsWith("/dl/")
    ? parsed.pathname
    : `/dl${parsed.pathname.startsWith("/") ? "" : "/"}${parsed.pathname}`;
  parsed.searchParams.set("affid", affid);

  return parsed.toString();
}

export function rewriteAmazonUrl(url, configOrTag = "creator-a-21") {
  const parsed = parseUrlSafely(url);
  const { amazonTag, flipkartAffid } = normalizeRewriteConfig(configOrTag);

  if (!parsed) {
    return String(url || "");
  }

  if (isAmazonDomain(parsed.hostname)) {
    return rewriteDirectAmazonUrl(parsed.toString(), amazonTag);
  }

  if (isFlipkartDomain(parsed.hostname)) {
    return rewriteDirectFlipkartUrl(parsed.toString(), flipkartAffid);
  }

  const nestedUrl = parsed.searchParams.get("url");

  if (!nestedUrl) {
    return parsed.toString();
  }

  const rewrittenNestedUrl = isAmazonDomain(parseUrlSafely(nestedUrl)?.hostname)
    ? rewriteDirectAmazonUrl(nestedUrl, amazonTag)
    : rewriteDirectFlipkartUrl(nestedUrl, flipkartAffid);

  if (rewrittenNestedUrl === nestedUrl) {
    return parsed.toString();
  }

  parsed.searchParams.set("url", rewrittenNestedUrl);
  return parsed.toString();
}
