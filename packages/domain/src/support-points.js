const POINTS_RULES = {
  shopping_link_routed: 20,
  creator_content_share_created: 5,
  creator_content_share_clicked: 2,
  reward_claimed: 0,
};

export function getPointsForAction(actionType) {
  return POINTS_RULES[actionType] ?? 0;
}
