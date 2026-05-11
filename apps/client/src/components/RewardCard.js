import React, { useState } from "react";
import { Linking, Text, View } from "react-native";
import { useAppContext } from "../context";
import { claimReward } from "../lib";
import { Card, BodyText, PrimaryButton, SecondaryButton } from "./ui";
import { theme } from "../theme";
import { supabase } from "../lib";

const REWARD_TYPE_LABELS = {
  early_access: "Early Access",
  shared_community: "Shared Community",
  private_ama: "Private AMA",
};

export function RewardCard({ reward, supportScore, onClaimed }) {
  const { currentCreator, session, intent } = useAppContext();
  const [claimed, setClaimed] = useState(reward.isClaimed);
  const [destinationUrl, setDestinationUrl] = useState(reward.destinationUrl || null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  const isCreatorOwner = intent === "creator" && currentCreator?.id === reward.creatorId;
  const isUnlocked = reward.isUnlocked;
  const canClaim = isUnlocked && !claimed && session?.id && session.mode !== "demo";

  async function handleClaim() {
    setClaiming(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      const result = await claimReward({
        rewardId: reward.id,
        accessToken,
      });
      setClaimed(true);
      if (result.destinationUrl) {
        setDestinationUrl(result.destinationUrl);
      }
      if (onClaimed) {
        onClaimed(reward.id);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <Card style={cardStyles.card}>
      <View style={cardStyles.header}>
        <View style={cardStyles.badgeWrap}>
          <Text style={cardStyles.badge}>
            {REWARD_TYPE_LABELS[reward.rewardType] || reward.rewardType}
          </Text>
        </View>
        {isCreatorOwner ? (
          <View style={reward.isActive ? cardStyles.unlockedBadge : cardStyles.lockedBadge}>
            <Text style={reward.isActive ? cardStyles.unlockedText : cardStyles.lockedText}>
              {reward.isActive ? "Active" : "Inactive"}
            </Text>
          </View>
        ) : claimed ? (
          <View style={cardStyles.claimedBadge}>
            <Text style={cardStyles.claimedText}>Claimed</Text>
          </View>
        ) : isUnlocked ? (
          <View style={cardStyles.unlockedBadge}>
            <Text style={cardStyles.unlockedText}>Unlocked</Text>
          </View>
        ) : (
          <View style={cardStyles.lockedBadge}>
            <Text style={cardStyles.lockedText}>Locked</Text>
          </View>
        )}
      </View>

      <Text style={cardStyles.title}>{reward.title}</Text>
      {reward.description ? <BodyText>{reward.description}</BodyText> : null}

      <View style={cardStyles.footer}>
        <Text style={cardStyles.required}>
          {reward.requiredPoints} points required
        </Text>
        {!isUnlocked && reward.pointsRemaining != null ? (
          <Text style={cardStyles.remaining}>
            {reward.pointsRemaining} points to go
          </Text>
        ) : null}
      </View>

      {canClaim ? (
        <PrimaryButton
          compact
          label={claiming ? "Claiming..." : "Claim reward"}
          onPress={handleClaim}
          disabled={claiming}
        />
      ) : null}

      {claimed && destinationUrl ? (
        <View style={cardStyles.destinationBlock}>
          <Text style={cardStyles.destinationLabel}>Access URL</Text>
          <Text style={cardStyles.destinationUrl} numberOfLines={2}>
            {destinationUrl}
          </Text>
          <SecondaryButton
            compact
            label="Open"
            onPress={() => Linking.openURL(destinationUrl).catch(() => {})}
          />
        </View>
      ) : null}

      {error ? (
        <BodyText style={{ color: theme.colors.errorText }}>{error}</BodyText>
      ) : null}
    </Card>
  );
}

const cardStyles = {
  card: {
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  badgeWrap: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(143,1,100,0.14)",
  },
  badge: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  claimedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.14)",
  },
  claimedText: {
    color: "#4ade80",
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  unlockedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(143,1,100,0.2)",
  },
  unlockedText: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  lockedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.12)",
  },
  lockedText: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 22,
    lineHeight: 28,
  },
  footer: {
    flexDirection: "row",
    gap: theme.spacing.md,
    alignItems: "baseline",
  },
  required: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  remaining: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    fontSize: 12,
  },
  destinationBlock: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  destinationLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 4,
  },
  destinationUrl: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
  },
};
