"use strict";

function normalizeDomain(value) {
  return String(value || "")
    .trim()
    .replace(/^www\./i, "")
    .toLowerCase();
}

function extractDomain(url) {
  if (!url) {
    return "";
  }

  try {
    return normalizeDomain(new URL(url).hostname);
  } catch (error) {
    return "";
  }
}

function creatorSupportsDomain(creator, domain) {
  if (!creator || !domain) {
    return false;
  }

  const supportedDomains = Array.isArray(creator.domains) ? creator.domains : [];

  return supportedDomains.some((entry) => normalizeDomain(entry) === normalizeDomain(domain));
}

function filterEligibleCreators(creators, domain) {
  if (!domain) {
    return creators.slice();
  }

  return creators.filter((creator) => creatorSupportsDomain(creator, domain));
}

module.exports = {
  creatorSupportsDomain,
  extractDomain,
  filterEligibleCreators,
  normalizeDomain
};
