const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const externalSelectionService = {
  selectCreator(weights) {
    if (!Array.isArray(weights) || weights.length === 0) {
      return null;
    }

    const totalWeight = weights.reduce((sum, item) => sum + toNumber(item.weight), 0);
    const totalAttributedValue = weights.reduce(
      (sum, item) => sum + toNumber(item.attributedValueTotal),
      0
    );
    const totalEvents = weights.reduce((sum, item) => sum + toNumber(item.eventCount), 0);

    const ranked = [...weights].sort((left, right) => {
      const leftTargetShare = totalWeight > 0 ? toNumber(left.weight) / totalWeight : 0;
      const rightTargetShare = totalWeight > 0 ? toNumber(right.weight) / totalWeight : 0;

      const leftActualShare =
        totalAttributedValue > 0
          ? toNumber(left.attributedValueTotal) / totalAttributedValue
          : totalEvents > 0
            ? toNumber(left.eventCount) / totalEvents
            : 0;
      const rightActualShare =
        totalAttributedValue > 0
          ? toNumber(right.attributedValueTotal) / totalAttributedValue
          : totalEvents > 0
            ? toNumber(right.eventCount) / totalEvents
            : 0;

      const leftDeficit = leftTargetShare - leftActualShare;
      const rightDeficit = rightTargetShare - rightActualShare;

      if (leftDeficit !== rightDeficit) {
        return rightDeficit - leftDeficit;
      }

      if (toNumber(left.attributedValueTotal) !== toNumber(right.attributedValueTotal)) {
        return toNumber(left.attributedValueTotal) - toNumber(right.attributedValueTotal);
      }

      if (toNumber(left.eventCount) !== toNumber(right.eventCount)) {
        return toNumber(left.eventCount) - toNumber(right.eventCount);
      }

      return String(left.updatedAt || "").localeCompare(String(right.updatedAt || ""));
    });

    return ranked[0] || null;
  }
};
