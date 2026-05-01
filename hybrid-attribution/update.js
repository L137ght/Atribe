"use strict";

const DEFAULT_FALLBACK_VALUE = 1;

function createUserState() {
  return {
    totalEvents: 0,
    totalEstimatedValue: 0
  };
}

function recordEvent(creator, price, options) {
  if (!creator) {
    throw new Error("A creator must be provided.");
  }

  const fallbackValue =
    Number.isFinite(options?.fallbackValue) && options.fallbackValue > 0
      ? options.fallbackValue
      : DEFAULT_FALLBACK_VALUE;
  const appliedValue = Number.isFinite(price) && price > 0 ? price : fallbackValue;

  creator.eventCount = (Number(creator.eventCount) || 0) + 1;
  creator.estimatedValue = (Number(creator.estimatedValue) || 0) + appliedValue;

  return appliedValue;
}

function recordUserTotals(userState, appliedValue) {
  if (!userState) {
    return null;
  }

  userState.totalEvents = (Number(userState.totalEvents) || 0) + 1;
  userState.totalEstimatedValue =
    (Number(userState.totalEstimatedValue) || 0) + (Number(appliedValue) || 0);

  return userState;
}

module.exports = {
  DEFAULT_FALLBACK_VALUE,
  createUserState,
  recordEvent,
  recordUserTotals
};
