"use strict";

const AMAZON_PRICE_PATTERNS = [
  /id=["']priceblock_ourprice["'][^>]*>\s*[$£€]?([0-9][0-9,]*\.?[0-9]{0,2})/i,
  /id=["']priceblock_dealprice["'][^>]*>\s*[$£€]?([0-9][0-9,]*\.?[0-9]{0,2})/i,
  /class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*[$£€]?([0-9][0-9,]*\.?[0-9]{0,2})/i
];

const GENERIC_CURRENCY_PATTERN =
  /(?:[$£€]|USD|GBP|EUR|INR|Rs\.?)\s*([0-9][0-9,]*\.?[0-9]{0,2})|([0-9][0-9,]*\.?[0-9]{0,2})\s*(?:USD|GBP|EUR|INR)/i;

function parsePriceMatch(match) {
  if (!match) {
    return null;
  }

  const rawValue = match[1] || match[2];

  if (!rawValue) {
    return null;
  }

  const numericValue = Number(rawValue.replace(/,/g, ""));

  return Number.isFinite(numericValue) ? numericValue : null;
}

function extractAmazonPrice(html) {
  for (const pattern of AMAZON_PRICE_PATTERNS) {
    const value = parsePriceMatch(pattern.exec(html));

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function extractGenericPrice(html) {
  return parsePriceMatch(GENERIC_CURRENCY_PATTERN.exec(html));
}

function extractPrice(html, domain) {
  if (!html || typeof html !== "string") {
    return null;
  }

  if (/amazon\./i.test(domain || "")) {
    return extractAmazonPrice(html);
  }

  return extractGenericPrice(html);
}

module.exports = {
  extractPrice
};
