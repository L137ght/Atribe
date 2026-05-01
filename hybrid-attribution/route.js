"use strict";

const { extractDomain, filterEligibleCreators } = require("./domain");
const { extractPrice } = require("./price");
const { selectCreator } = require("./selection");
const { recordEvent, recordUserTotals } = require("./update");

function computeTotals(creators) {
  return creators.reduce(
    (totals, creator) => {
      totals.totalEvents += Number(creator.eventCount) || 0;
      totals.totalEstimatedValue += Number(creator.estimatedValue) || 0;
      return totals;
    },
    { totalEvents: 0, totalEstimatedValue: 0 }
  );
}

function routeEvent(url, creators, html, options) {
  if (!Array.isArray(creators) || creators.length === 0) {
    throw new Error("At least one creator is required.");
  }

  const domain = extractDomain(url);
  const eligibleCreators = filterEligibleCreators(creators, domain);

  if (eligibleCreators.length === 0) {
    throw new Error(
      domain
        ? `No creators have an affiliate link for ${domain}.`
        : "No eligible creators available for routing."
    );
  }

  const price = extractPrice(html, domain);
  const selection = selectCreator(eligibleCreators, options);
  const valueUsed = recordEvent(selection.creator, price, options);
  const userState = recordUserTotals(options?.userState, valueUsed);
  const totals = computeTotals(creators);

  return {
    creator: selection.creator,
    domain,
    price,
    valueUsed,
    deficit: selection.deficit,
    targetShare: selection.targetShare,
    actualShareBeforeEvent: selection.actualShare,
    totalEvents: userState?.totalEvents ?? totals.totalEvents,
    totalEstimatedValue: userState?.totalEstimatedValue ?? totals.totalEstimatedValue
  };
}

module.exports = {
  routeEvent
};
