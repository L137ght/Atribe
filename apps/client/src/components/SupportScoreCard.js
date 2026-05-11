import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAppContext } from "../context";
import { fetchSupportScores, isAtribeBackendConfigured } from "../lib";
import { Card, BodyText } from "./ui";
import { theme } from "../theme";
import { supabase } from "../lib";

export function SupportScoreCard({ refreshKey = 0 }) {
  const { session, intent } = useAppContext();
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canLoad = Boolean(session?.id && session.mode !== "demo" && isAtribeBackendConfigured);

  if (intent !== "supporter" && intent !== "creator") {
    return null;
  }

  if (!canLoad) {
    return null;
  }

  async function handleLoad() {
    if (!canLoad) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      const payload = await fetchSupportScores(accessToken);
      setScores(Array.isArray(payload) ? payload : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setScores(null);
    setError("");
  }, [refreshKey]);

  useEffect(() => {
    if (!canLoad || loading) {
      return;
    }

    if (scores === null && !error) {
      handleLoad();
    }
  }, [canLoad, error, loading, refreshKey, scores]);

  if (loading && !scores) {
    return (
      <Card style={styles.card}>
        <Text style={styles.loadText}>Loading your support scores...</Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.card}>
        <BodyText style={{ color: theme.colors.errorText }}>{error}</BodyText>
        <Pressable onPress={handleLoad} disabled={loading}>
          <Text style={styles.loadText}>{loading ? "Retrying..." : "Retry support scores"}</Text>
        </Pressable>
      </Card>
    );
  }

  if (!scores?.length) {
    return (
      <Card style={styles.card}>
        <Text style={styles.loadText}>No support scores yet.</Text>
        <BodyText>Start sharing creator content or routing shopping links to build your score.</BodyText>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {scores.map((score) => (
        <Card key={score.creatorId} style={styles.scoreCard}>
          <Text style={styles.creatorName}>{score.creatorName}</Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{score.lifetimePoints}</Text>
              <Text style={styles.statLabel}>lifetime pts</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{score.monthlyPoints}</Text>
              <Text style={styles.statLabel}>monthly pts</Text>
            </View>
          </View>
          {score.nextReward ? (
            <View style={styles.nextReward}>
              <Text style={styles.rewardLabel}>Next reward: {score.nextReward.title}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        100,
                        ((score.lifetimePoints) / score.nextReward.requiredPoints) * 100
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {score.nextReward.pointsRemaining} points to go
              </Text>
            </View>
          ) : null}
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
  loadText: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    fontSize: 14,
  },
  scoreCard: {
    gap: theme.spacing.sm,
  },
  creatorName: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    lineHeight: 30,
  },
  stats: {
    flexDirection: "row",
    gap: theme.spacing.xl,
  },
  stat: {
    gap: 4,
  },
  statValue: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.serif,
    fontSize: 36,
    lineHeight: 42,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  nextReward: {
    gap: 8,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  rewardLabel: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.accent,
    borderRadius: 3,
  },
  progressText: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
  },
};
