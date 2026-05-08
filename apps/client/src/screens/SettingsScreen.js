import React, { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  InputField,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  TutorialCallout
} from "../components";
import { theme } from "../theme";
import { TUTORIAL_STEPS } from "../utils";

export default function SettingsScreen({ navigation }) {
  const {
    addToTribe,
    advanceTutorial,
    brandHasActiveCampaign,
    brandInstallStatus,
    brandShopDomain,
    creatorBrandLinks,
    creators,
    creatorSocialAccounts,
    currentCreator,
    currentTutorialStep,
    distributionMode,
    getPreference,
    intent,
    removeFromTribe,
    session,
    skipTutorial,
    startTutorial,
    setDistributionMode,
    setIntent,
    signOut,
    tutorialActive,
    updatePreference
  } = useAppContext();
  const [query, setQuery] = useState("");

  const selectedCreators = useMemo(
    () => creators.filter((creator) => getPreference(creator.id)?.selected),
    [creators, getPreference]
  );
  const visibleCreators = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return creators.filter((creator) => {
      if (getPreference(creator.id)?.selected) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        creator.name.toLowerCase().includes(normalizedQuery) ||
        creator.platform?.toLowerCase().includes(normalizedQuery) ||
        creator.niche?.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [creators, getPreference, query]);

  const visibleCreatorSuggestions = visibleCreators.slice(0, 4);
  const activeConnectionsCount =
    (currentCreator?.links?.length || 0) +
    (creatorBrandLinks?.filter((link) => link.status !== "archived").length || 0);

  async function handleIntentChange(nextIntent) {
    try {
      await setIntent(nextIntent);

      if (nextIntent === "creator" && !currentCreator) {
        navigation.navigate("CreatorOnboarding");
        return;
      }

      if (nextIntent === "brand") {
        if (!brandShopDomain || brandInstallStatus?.install_status !== "installed") {
          navigation.navigate("BrandOnboarding");
          return;
        }

        navigation.navigate(brandHasActiveCampaign ? "BrandHome" : "CampaignGate");
        return;
      }

      navigation.navigate("Home");
    } catch (error) {
      Alert.alert("Settings", error.message);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      Alert.alert("Settings", error.message);
    }
  }

  async function handleDistributionModeChange(nextMode) {
    try {
      await setDistributionMode(nextMode);
    } catch (error) {
      Alert.alert("Settings", error.message);
    }
  }

  async function handleTutorialNext() {
    await advanceTutorial();
  }

  async function handleReplayTutorial() {
    await startTutorial("home");
    navigation.navigate("Home");
  }

  async function adjustWeight(creatorId, delta) {
    try {
      const currentWeight = getPreference(creatorId)?.weight || 50;
      const nextWeight = Math.max(10, Math.min(100, currentWeight + delta));
      await updatePreference(creatorId, { selected: true, weight: nextWeight });
    } catch (error) {
      Alert.alert("Settings", error.message);
    }
  }

  return (
    <AppShell
      navigation={navigation}
      activeRoute="Settings"
      title="Settings"
      subtitle={session?.email}
    >
      <SectionHeader
        eyebrow="Workspace"
        title="Preferences and access"
        body="Settings now combines account controls with tribe management to keep navigation lighter."
      />

      {tutorialActive && currentTutorialStep?.screen === "Settings" ? (
        <TutorialCallout
          step={currentTutorialStep}
          stepIndex={TUTORIAL_STEPS.findIndex((step) => step.id === currentTutorialStep.id)}
          stepCount={TUTORIAL_STEPS.length}
          onNext={handleTutorialNext}
          onSkip={skipTutorial}
        />
      ) : null}

      <View style={styles.sectionStack}>
        <Card style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Current tribe</Text>
          <BodyText>
            Manage the creators you route through here, then tune their weighting when weighted mode is active.
          </BodyText>

          {selectedCreators.length ? (
            <View style={styles.tribeStack}>
              {selectedCreators.map((creator) => {
                const preference = getPreference(creator.id);
                const weight = preference?.weight || 50;

                return (
                  <View key={creator.id} style={styles.creatorRow}>
                    <View style={styles.creatorCopy}>
                      <Text style={styles.roleTitle}>{creator.name}</Text>
                      <Text style={styles.creatorMeta}>
                        {creator.platform} · {creator.niche}
                      </Text>
                      <BodyText numberOfLines={2}>{creator.bio}</BodyText>
                    </View>

                    <View style={styles.creatorActions}>
                      {distributionMode === "weighted" ? (
                        <View style={styles.weightBlock}>
                          <View style={styles.weightHeader}>
                            <Text style={styles.weightLabel}>Weight</Text>
                            <Text style={styles.weightValue}>{weight}%</Text>
                          </View>
                          <View style={styles.weightTrack}>
                            <View
                              style={[styles.weightFill, { width: `${Math.min(weight, 100)}%` }]}
                            />
                          </View>
                          <View style={styles.actionRow}>
                            <SecondaryButton
                              compact
                              label="-10"
                              onPress={() => adjustWeight(creator.id, -10)}
                            />
                            <SecondaryButton
                              compact
                              label="+10"
                              onPress={() => adjustWeight(creator.id, 10)}
                            />
                          </View>
                        </View>
                      ) : (
                        <BodyText>Even split is active. Manual weighting is hidden.</BodyText>
                      )}

                      <SecondaryButton
                        label="Remove from tribe"
                        onPress={() => removeFromTribe(creator.id)}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <BodyText>
              No creators selected yet. Add creators below or use Discover to browse the full list.
            </BodyText>
          )}

          <View style={styles.inlineSection}>
            <InputField
              label="Add creators"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Search by creator, platform, or niche"
              value={query}
              onChangeText={setQuery}
            />

            <View style={styles.suggestionGrid}>
              {visibleCreatorSuggestions.length ? (
                visibleCreatorSuggestions.map((creator) => (
                  <View key={creator.id} style={styles.suggestionCard}>
                    <View style={styles.suggestionCopy}>
                      <Text style={styles.suggestionTitle}>{creator.name}</Text>
                      <Text style={styles.creatorMeta}>
                        {creator.platform} · {creator.niche}
                      </Text>
                    </View>
                    <PrimaryButton
                      compact
                      label="Add to tribe"
                      onPress={() => addToTribe(creator.id)}
                    />
                  </View>
                ))
              ) : (
                <BodyText>No matching creators found.</BodyText>
              )}
            </View>

            <SecondaryButton
              label="Open discover"
              onPress={() => navigation.navigate("CreatorDiscovery")}
            />
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Active role</Text>
          <BodyText>
            Supporters see routing and tribe tools. Creators manage profile and partnerships. Brands connect Shopify and launch creator campaigns.
          </BodyText>

          <View style={styles.roleStack}>
            <View style={[styles.roleCard, intent === "supporter" && styles.roleCardActive]}>
              <View style={styles.roleCopy}>
                <Text style={styles.roleTitle}>Supporter</Text>
                <BodyText>Route links and support your selected creators.</BodyText>
              </View>
              <SecondaryButton
                compact
                label={intent === "supporter" ? "Active" : "Switch"}
                selected={intent === "supporter"}
                onPress={() => handleIntentChange("supporter")}
              />
            </View>

            <View style={[styles.roleCard, intent === "creator" && styles.roleCardActive]}>
              <View style={styles.roleCopy}>
                <Text style={styles.roleTitle}>Creator</Text>
                <BodyText>
                  Manage your creator identity, add affiliate domains, and keep your workspace live.
                </BodyText>
              </View>
              <PrimaryButton
                compact
                label={intent === "creator" ? "Active" : "Switch"}
                onPress={() => handleIntentChange("creator")}
              />
            </View>

            <View style={[styles.roleCard, intent === "brand" && styles.roleCardActive]}>
              <View style={styles.roleCopy}>
                <Text style={styles.roleTitle}>Brand</Text>
                <BodyText>
                  Connect Shopify, launch a campaign, and open your creator-powered sales channel.
                </BodyText>
              </View>
              <PrimaryButton
                compact
                label={intent === "brand" ? "Active" : "Switch"}
                onPress={() => handleIntentChange("brand")}
              />
            </View>
          </View>
        </Card>

        {intent === "creator" ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Creator workspace</Text>
            <BodyText>
              Creator-specific setup lives here as well, so profile, socials, partnerships, and links are all on one page.
            </BodyText>

            <View style={styles.creatorWorkspaceGrid}>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>Profile</Text>
                <BodyText>{currentCreator?.name || "Creator profile not set up yet"}</BodyText>
                <BodyText>{currentCreator?.platform || "No primary platform selected"}</BodyText>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>Socials</Text>
                <BodyText>
                  {creatorSocialAccounts.length
                    ? `${creatorSocialAccounts.length} account${creatorSocialAccounts.length === 1 ? "" : "s"} connected`
                    : "No social accounts connected yet"}
                </BodyText>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>Connections</Text>
                <BodyText>
                  {activeConnectionsCount
                    ? `${activeConnectionsCount} active creator connection${activeConnectionsCount === 1 ? "" : "s"}`
                    : "No brand or domain connections yet"}
                </BodyText>
              </View>
            </View>

            <View style={styles.actionRow}>
              <PrimaryButton
                label="Open dashboard"
                onPress={() => navigation.navigate("CreatorDashboard")}
              />
              <SecondaryButton
                label="Add socials"
                onPress={() => navigation.navigate("ConnectSocialAccounts", { origin: "settings" })}
              />
              <SecondaryButton
                label="Connect brands"
                onPress={() => navigation.navigate("ConnectBrands")}
              />
              <SecondaryButton
                label="Manage links"
                onPress={() => navigation.navigate("AddAffiliateLinks")}
              />
            </View>
          </Card>
        ) : intent === "brand" ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Shopify connection</Text>
            <BodyText>
              {brandShopDomain
                ? `Connected store target: ${brandShopDomain}`
                : "No Shopify store connected yet."}
            </BodyText>
            <BodyText>
              {brandHasActiveCampaign
                ? "At least one active campaign exists."
                : "You need one active campaign before brand tools unlock."}
            </BodyText>
            <PrimaryButton
              label={brandShopDomain ? "Manage brand flow" : "Connect Shopify"}
              onPress={() =>
                navigation.navigate(
                  brandShopDomain && brandInstallStatus?.install_status === "installed"
                    ? brandHasActiveCampaign
                      ? "BrandHome"
                      : "CampaignGate"
                    : "BrandOnboarding"
                )
              }
            />
          </Card>
        ) : null}

        <Card style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Routing</Text>
          <BodyText>
            Choose whether tribe routing uses custom weights or splits attribution evenly across selected creators.
          </BodyText>

          <View style={styles.modeStack}>
            <View
              style={[
                styles.modeCard,
                distributionMode === "weighted" && styles.roleCardActive
              ]}
            >
              <View style={styles.roleCopy}>
                <Text style={styles.roleTitle}>Weighted</Text>
                <BodyText>Keep manual percentages and show the weight sliders.</BodyText>
              </View>
              <SecondaryButton
                compact
                label={distributionMode === "weighted" ? "Active" : "Use"}
                selected={distributionMode === "weighted"}
                onPress={() => handleDistributionModeChange("weighted")}
              />
            </View>

            <View
              style={[styles.modeCard, distributionMode === "even" && styles.roleCardActive]}
            >
              <View style={styles.roleCopy}>
                <Text style={styles.roleTitle}>Even split</Text>
                <BodyText>
                  Distribute attribution equally and hide manual weight controls.
                </BodyText>
              </View>
              <PrimaryButton
                compact
                label={distributionMode === "even" ? "Active" : "Use"}
                onPress={() => handleDistributionModeChange("even")}
              />
            </View>
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Account</Text>
          <BodyText>{session?.name || "Atribe member"}</BodyText>
          <BodyText>{session?.email || ""}</BodyText>
          <View style={styles.actionRow}>
            <SecondaryButton label="Replay tutorial" onPress={handleReplayTutorial} />
            <SecondaryButton label="Sign out" onPress={handleSignOut} />
          </View>
        </Card>
      </View>
    </AppShell>
  );
}

const styles = {
  sectionStack: {
    gap: theme.spacing.lg
  },
  sectionCard: {
    gap: theme.spacing.md
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 30,
    lineHeight: 36
  },
  roleStack: {
    gap: theme.spacing.md
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceElevated
  },
  roleCardActive: {
    borderColor: theme.colors.accentBorder
  },
  roleCopy: {
    flex: 1,
    gap: 4
  },
  roleTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    lineHeight: 30
  },
  tribeStack: {
    gap: theme.spacing.md
  },
  creatorRow: {
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceElevated
  },
  creatorCopy: {
    gap: 6
  },
  creatorMeta: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  creatorActions: {
    gap: theme.spacing.sm
  },
  inlineSection: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle
  },
  suggestionGrid: {
    gap: theme.spacing.sm
  },
  suggestionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceElevated
  },
  suggestionCopy: {
    flex: 1,
    gap: 4
  },
  suggestionTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    lineHeight: 26
  },
  creatorWorkspaceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  infoCard: {
    flex: 1,
    minWidth: 200,
    gap: 4,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceElevated
  },
  infoCardTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  modeStack: {
    gap: theme.spacing.md
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceElevated
  },
  weightBlock: {
    gap: theme.spacing.sm
  },
  weightHeader: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  weightLabel: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontWeight: "600"
  },
  weightValue: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontWeight: "700"
  },
  weightTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceStrong
  },
  weightFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.accent
  }
};
