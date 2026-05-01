"use strict";

const { extractDomain, filterEligibleCreators, normalizeDomain } = require("./domain");
const { extractPrice } = require("./price");
const { routeEvent } = require("./route");
const { selectCreator } = require("./selection");
const {
  createUserState,
  DEFAULT_FALLBACK_VALUE,
  recordEvent,
  recordUserTotals
} = require("./update");

module.exports = {
  createUserState,
  DEFAULT_FALLBACK_VALUE,
  extractDomain,
  extractPrice,
  filterEligibleCreators,
  normalizeDomain,
  recordEvent,
  recordUserTotals,
  routeEvent,
  selectCreator
};
