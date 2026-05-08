import React from "react";
import { Text, View } from "react-native";
import {
  AppShell,
  BodyText,
  Card,
  PrimaryButton,
  SecondaryButton
} from "../components";
import { theme } from "../theme";

export default function FeedbackScreen({ navigation, route }) {
  const creatorName = route.params?.creatorName || "your creator";
  const domain = route.params?.domain || "this brand";

  return (
    <AppShell navigation={navigation}>
      <View style={styles.container}>
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeIcon}>✓</Text>
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.title}>
            You supported <Text style={styles.emphasis}>{creatorName}</Text>
          </Text>
          <BodyText style={styles.centerText}>
            Your routed link now carries attribution for {domain}, following the creator weighting you configured in the new system.
          </BodyText>
        </View>

        <View style={styles.cardGrid}>
          <Card style={styles.card}>
            <Text style={styles.label}>Impact</Text>
            <Text style={styles.cardHeadline}>The routed link is active and ready to open or share.</Text>
          </Card>
          <Card style={styles.card}>
            <Text style={styles.label}>Next</Text>
            <Text style={styles.cardHeadline}>Return to the routing workspace or keep curating your tribe.</Text>
          </Card>
        </View>

        <View style={styles.actionRow}>
          <PrimaryButton label="Return to route" onPress={() => navigation.navigate("Home")} />
          <SecondaryButton
            label="Explore others"
            onPress={() => navigation.navigate("CreatorDiscovery")}
          />
        </View>
      </View>
    </AppShell>
  );
}

const styles = {
  container: {
    alignItems: "center",
    gap: theme.spacing.xl,
    paddingVertical: theme.spacing.xl
  },
  badgeWrap: {
    width: 108,
    height: 108,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder
  },
  badgeIcon: {
    fontSize: 52,
    color: theme.colors.accent,
    fontWeight: "700"
  },
  copyBlock: {
    maxWidth: 760,
    alignItems: "center",
    gap: theme.spacing.md
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 46,
    lineHeight: 54,
    textAlign: "center"
  },
  emphasis: {
    color: theme.colors.accent
  },
  centerText: {
    textAlign: "center"
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    width: "100%"
  },
  card: {
    flex: 1,
    minWidth: 280
  },
  label: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontWeight: "700",
    fontSize: 11
  },
  cardHeadline: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 26,
    lineHeight: 32
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: theme.spacing.md
  }
};
