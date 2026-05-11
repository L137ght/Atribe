export function canUnlockReward({ supportScore, reward }) {
  if (!supportScore || !reward) {
    return false;
  }

  return Number(supportScore.lifetimePoints || 0) >= Number(reward.requiredPoints || 0);
}

export function getRewardStatus({ supportScore, reward, claim }) {
  if (!reward) {
    return { isUnlocked: false, isClaimed: false, pointsRemaining: null };
  }

  if (!supportScore) {
    return {
      isUnlocked: false,
      isClaimed: Boolean(claim),
      pointsRemaining: Number(reward.requiredPoints || 0),
    };
  }

  const lifetimePoints = Number(supportScore.lifetimePoints || 0);
  const requiredPoints = Number(reward.requiredPoints || 0);
  const isUnlocked = lifetimePoints >= requiredPoints;
  const isClaimed = Boolean(claim);
  const pointsRemaining = isUnlocked ? 0 : requiredPoints - lifetimePoints;

  return { isUnlocked, isClaimed, pointsRemaining };
}
