import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  CreateRewardForm,
  PrimaryButton,
  RewardCard,
  SecondaryButton,
  SectionHeader,
  StatTile
} from "../components";
import { fetchCreatorRewards, isAtribeBackendConfigured, supabase } from "../lib";
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
    id: "rewards",
    label: "Rewards",
    title: "Creator rewards",
    body: "Create rewards for your shoppers to unlock with support points.",
    primaryLabel: "Create a reward",
    route: null,
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
    id: "bio",
    label: "Link in Bio",
    title: "Link in Bio",
    body: "Create a living profile page that updates with your latest content.",
    primaryLabel: "Set Up My Page",
    route: "CreatorBioPage"
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
  const { currentCreator, session } = useAppContext();
  const [activeAction, setActiveAction] = useState("brands");
  const [rewards, setRewards] = useState([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsError, setRewardsError] = useState("");
  const addedBrandsCount = currentCreator?.links?.length || 0;
  const selectedAction = ACTIONS.find((action) => action.id === activeAction) || ACTIONS[0];

  const loadRewards = useCallback(async () => {
    if (!currentCreator?.id || !session?.id || session.mode === "demo") {
      return;
    }

    if (!isAtribeBackendConfigured) {
      return;
    }

    setRewardsLoading(true);
    setRewardsError("");
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      const payload = await fetchCreatorRewards({
        creatorId: currentCreator.id,
        accessToken,
      });
      setRewards(Array.isArray(payload) ? payload : []);
    } catch (e) {
      setRewardsError(e.message);
    } finally {
      setRewardsLoading(false);
    }
  }, [currentCreator?.id, session?.id, session?.mode]);

  useEffect(() => {
    if (activeAction === "rewards") {
      loadRewards();
    }
  }, [activeAction, loadRewards]);

  function renderActionContent() {
    if (activeAction === "rewards") {
      return (
        <Card style={styles.primaryCard}>
          <Text style={styles.primaryTitle}>Creator rewards</Text>
          <BodyText>Create rewards and watch your shoppers level up.</BodyText>

          <CreateRewardForm onCreated={loadRewards} />

          {rewards.length > 0 ? (
            <View style={styles.rewardsList}>
              <Text style={styles.rewardsSectionTitle}>Your rewards</Text>
              {rewards.map((reward) => (
                <RewardCard key={reward.id} reward={reward} />
              ))}
            </View>
          ) : rewardsLoading ? (
            <BodyText>Loading rewards...</BodyText>
          ) : null}

          {rewardsError ? (
            <BodyText style={{ color: theme.colors.errorText }}>{rewardsError}</BodyText>
          ) : null}
        </Card>
      );
    }

    return (
      <Card style={styles.primaryCard}>
        <Text style={styles.primaryTitle}>{selectedAction.title}</Text>
        <BodyText>{selectedAction.body}</BodyText>
        {selectedAction.route ? (
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
        ) : null}
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
    );
  }

  return (
    <AppShell
      navigation={navigation}
      activeRoute="CreatorDashboard"
    >
      <SectionHeader eyebrow="Creator dashboard" title="Forge connections." />

      <View style={styles.layout}>
        <View style={styles.mainColumn}>
          <Card style={styles.shareStoryCard}>
            <View style={styles.shareStoryCopy}>
              <Text style={styles.shareStoryTitle}>Share to Story</Text>
              <BodyText>Invite your audience to support you through Atribe.</BodyText>
            </View>
            <PrimaryButton
              label="Create Story Card"
              onPress={() => navigation.navigate("CreatorShareStory")}
              variant="gradient"
            />
          </Card>

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

          {renderActionContent()}
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
  shareStoryCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.accentBorder
  },
  shareStoryCopy: {
    flex: 1,
    minWidth: 240,
    gap: 6
  },
  shareStoryTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 30,
    lineHeight: 36
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
  },
  rewardsList: {
    gap: theme.spacing.md,
  },
  rewardsSectionTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 22,
    lineHeight: 28,
  },
};
