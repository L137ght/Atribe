"use strict";

function toFiniteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function sumTargetWeights(creators) {
  return creators.reduce(
    (sum, creator) => sum + Math.max(0, toFiniteNumber(Number(creator.targetWeight), 0)),
    0
  );
}

function sumActualMetric(creators, useEstimatedValue) {
  const key = useEstimatedValue ? "estimatedValue" : "eventCount";

  return creators.reduce((sum, creator) => {
    return sum + Math.max(0, toFiniteNumber(Number(creator[key]), 0));
  }, 0);
}

function buildCreatorSnapshot(creator, totals, smoothingFactor) {
  const targetWeightTotal = totals.totalTargetWeight || 1;
  const actualMetricTotal = totals.totalActualMetric || 0;
  const targetShare = Math.max(0, Number(creator.targetWeight) || 0) / targetWeightTotal;

  let rawActualShare = 0;

  if (actualMetricTotal > 0) {
    const actualMetric = totals.useEstimatedValue
      ? Math.max(0, Number(creator.estimatedValue) || 0)
      : Math.max(0, Number(creator.eventCount) || 0);

    rawActualShare = actualMetric / actualMetricTotal;
  }

  const actualShare =
    smoothingFactor > 0
      ? rawActualShare + smoothingFactor * (targetShare - rawActualShare)
      : rawActualShare;

  return {
    creator,
    targetShare,
    actualShare,
    deficit: targetShare - actualShare
  };
}

function chooseWithTieBreak(candidates, options) {
  if (candidates.length === 1) {
    return candidates[0];
  }

  if (options.randomTieBreak) {
    const index = Math.floor(Math.random() * candidates.length);
    return candidates[index];
  }

  return candidates
    .slice()
    .sort((left, right) => String(left.creator.id).localeCompare(String(right.creator.id)))[0];
}

function selectCreator(creators, options) {
  const settings = {
    epsilon: 1e-9,
    randomTieBreak: false,
    smoothingFactor: 0,
    ...options
  };

  if (!Array.isArray(creators) || creators.length === 0) {
    throw new Error("At least one eligible creator is required.");
  }

  const totalEstimatedValue = sumActualMetric(creators, true);
  const useEstimatedValue = totalEstimatedValue > 0;
  const totals = {
    totalTargetWeight: sumTargetWeights(creators),
    totalActualMetric: useEstimatedValue
      ? totalEstimatedValue
      : sumActualMetric(creators, false),
    useEstimatedValue
  };

  if (totals.totalTargetWeight <= 0) {
    throw new Error("Total target weight must be greater than zero.");
  }

  const snapshots = creators.map((creator) =>
    buildCreatorSnapshot(creator, totals, settings.smoothingFactor)
  );

  let maxDeficit = -Infinity;

  for (const snapshot of snapshots) {
    if (snapshot.deficit > maxDeficit) {
      maxDeficit = snapshot.deficit;
    }
  }

  const candidates = snapshots.filter(
    (snapshot) => Math.abs(snapshot.deficit - maxDeficit) <= settings.epsilon
  );

  return chooseWithTieBreak(candidates, settings);
}

module.exports = {
  selectCreator
};
