import React, { useState } from "react";
import { Text, View } from "react-native";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  StatTile
} from "../components";
import { theme } from "../theme";

const ACTIONS = [
  {
    id: "brands",
    label: "Connect brands",
    title: "Connect brands",
    body: "Choose the brands you want to work with.",
    primaryLabel: "Add brands",
    route: "ConnectBrands",
    detailLabel: "Generate smart links to your brands",
    detailBody: "Browse brand affiliations and move into link generation.",
    detailActionLabel: "Generate smart links"
  },
  {
    id: "socials",
    label: "Connect socials",
    title: "Connect socials",
    body: "Link the profiles you want to use with Atribe.",
    primaryLabel: "Connect socials",
    route: "ConnectSocialAccounts"
  },
  {
    id: "domain",
    label: "Add domain",
    title: "Add domain",
    body: "Add the domains where your audience can support you.",
    primaryLabel: "Add domain",
    route: "AddAffiliateLinks"
  },
  {
    id: "creators",
    label: "Add creators",
    title: "Add creators",
    body: "Select who you want to support before generating your link.",
    primaryLabel: "Add creator",
    route: "CreatorSelection",
    footer: "No creators selected"
  }
];

export default function CreatorDashboardScreen({ navigation }) {
  const { currentCreator } = useAppContext();
  const [activeAction, setActiveAction] = useState("brands");
  const addedBrandsCount = currentCreator?.links?.length || 0;
  const selectedAction = ACTIONS.find((action) => action.id === activeAction) || ACTIONS[0];

  return (
    <AppShell
      navigation={navigation}
      activeRoute="CreatorDashboard"
      title="Dashboard"
      subtitle="Add links"
    >
      <SectionHeader eyebrow="Add brands" title="Forge connections." />

      <View style={styles.layout}>
        <View style={styles.mainColumn}>
          <Card style={styles.actionPickerCard}>
            <View style={styles.actionPickerRow}>
              {ACTIONS.map((action) => (
                <SecondaryButton
                  key={action.id}
                  compact
                  label={action.label}
                  selected={activeAction === action.id}
                  onPress={() => setActiveAction(action.id)}
                />
              ))}
            </View>
          </Card>

          <Card style={styles.primaryCard}>
            <Text style={styles.primaryTitle}>{selectedAction.title}</Text>
            <BodyText>{selectedAction.body}</BodyText>
            <PrimaryButton
              label={selectedAction.primaryLabel}
              onPress={() =>
                navigation.navigate(
                  selectedAction.route,
                  selectedAction.route === "ConnectSocialAccounts"
                    ? { origin: "settings" }
                    : undefined
                )
              }
              variant="gradient"
            />
            {selectedAction.detailLabel ? (
              <View style={styles.detailBlock}>
                <Text style={styles.detailTitle}>{selectedAction.detailLabel}</Text>
                <BodyText>{selectedAction.detailBody}</BodyText>
                <PrimaryButton
                  label={selectedAction.detailActionLabel}
                  onPress={() => navigation.navigate("ConnectBrands")}
                />
              </View>
            ) : null}
            {selectedAction.footer ? (
              <BodyText style={styles.emptyState}>{selectedAction.footer}</BodyText>
            ) : null}
          </Card>
        </View>

        <View style={styles.sideColumn}>
          <StatTile
            label="Added"
            value={String(addedBrandsCount)}
            detail="Brands"
          />
        </View>
      </View>
    </AppShell>
  );
}

const styles = {
  layout: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.lg
  },
  mainColumn: {
    flex: 1,
    minWidth: 320,
    gap: theme.spacing.md
  },
  sideColumn: {
    width: 220,
    gap: theme.spacing.md
  },
  actionPickerCard: {
    padding: theme.spacing.md
  },
  actionPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  primaryCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.accentBorder
  },
  primaryTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 34,
    lineHeight: 40
  },
  detailBlock: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle
  },
  detailTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    fontSize: 18,
    lineHeight: 24
  },
  emptyState: {
    color: theme.colors.textMuted
  }
};
