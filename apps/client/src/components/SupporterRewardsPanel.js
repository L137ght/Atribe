import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useAppContext } from "../context";
import { fetchCreatorRewards, isAtribeBackendConfigured, supabase } from "../lib";
import { Card, BodyText } from "./ui";
import { RewardCard } from "./RewardCard";
import { theme } from "../theme";

export function SupporterRewardsPanel({ creators = [], refreshKey = 0, onClaimed }) {
  const { session, intent } = useAppContext();
  const [rewardGroups, setRewardGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canLoad = Boolean(
    intent === "supporter" &&
    session?.id &&
    session.mode !== "demo" &&
    isAtribeBackendConfigured &&
    creators.length > 0
  );

  useEffect(() => {
    if (!canLoad) {
      setRewardGroups([]);
      setError("");
      return;
    }

    let cancelled = false;

    async function loadRewards() {
      setLoading(true);
      setError("");
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;

        const payload = await Promise.all(
          creators.map(async (creator) => ({
            creator,
            rewards: await fetchCreatorRewards({
              creatorId: creator.id,
              accessToken,
            }),
          }))
        );

        if (!cancelled) {
          setRewardGroups(payload.filter((group) => Array.isArray(group.rewards) && group.rewards.length > 0));
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRewards();

    return () => {
      cancelled = true;
    };
  }, [canLoad, creators, refreshKey]);

  if (intent !== "supporter") {
    return null;
  }

  if (session?.mode === "demo") {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Shopper rewards</Text>
        <BodyText>Sign in with a non-demo account to view unlockable rewards and claim them.</BodyText>
      </Card>
    );
  }

  if (!creators.length) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Shopper rewards</Text>
        <BodyText>Add creators to your tribe to see their locked and unlocked rewards.</BodyText>
      </Card>
    );
  }

  if (!isAtribeBackendConfigured) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Shopper rewards</Text>
        <BodyText>Set `EXPO_PUBLIC_ATRIBE_BACKEND_URL` to load rewards from the backend.</BodyText>
      </Card>
    );
  }

  if (loading && !rewardGroups.length) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Shopper rewards</Text>
        <BodyText>Loading creator rewards...</BodyText>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Shopper rewards</Text>
        <BodyText style={{ color: theme.colors.errorText }}>{error}</BodyText>
      </Card>
    );
  }

  if (!rewardGroups.length) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Shopper rewards</Text>
        <BodyText>Your supported creators do not have active rewards yet.</BodyText>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {rewardGroups.map((group) => (
        <Card key={group.creator.id} style={styles.card}>
          <Text style={styles.title}>{group.creator.name} rewards</Text>
          <View style={styles.rewardsList}>
            {group.rewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                onClaimed={() => {
                  if (onClaimed) {
                    onClaimed(reward.id);
                  }
                }}
              />
            ))}
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = {
  container: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    lineHeight: 30,
  },
  rewardsList: {
    gap: theme.spacing.md,
  },
};
