import React, { useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useAppContext } from "../context";
import { SOCIAL_ACCOUNT_PLATFORMS, YOUTUBE_NICHES } from "../data";
import { supabase } from "../lib";
import {
  AppShell,
  BodyText,
  Card,
  InputField,
  Kicker,
  SectionHeader,
  PrimaryButton,
  SecondaryButton
} from "../components";
import { theme } from "../theme";

const PLATFORM_OPTIONS = [
  "YouTube",
  "GitHub",
  "Spotify",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Twitch",
  "Discord"
];
const PENDING_OAUTH_KEY = "atribe.pending-social-oauth";
const SKIP_INTENT_SELECTION_ONCE_KEY = "atribe.skip-intent-selection-once";

export default function CreatorOnboardingScreen({ navigation }) {
  const { completeCreatorOnboarding, connectSocialAccount, creatorSocialAccounts, currentCreator, session } =
    useAppContext();
  const [creatorName, setCreatorName] = useState(currentCreator?.name || "");
  const [selectedPlatforms, setSelectedPlatforms] = useState(() => {
    const value = currentCreator?.platform || "";
    if (!value) {
      return [];
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  });
  const [selectedNiches, setSelectedNiches] = useState([]);
  const [selectedSubNiches, setSelectedSubNiches] = useState({});
  const [accountChoice, setAccountChoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const persistedConnectedPlatforms = useMemo(
    () => new Set((creatorSocialAccounts || []).map((account) => account.platform)),
    [creatorSocialAccounts]
  );
  const [localConnectedPlatforms, setLocalConnectedPlatforms] = useState(new Set());
  const [localOAuthProviders, setLocalOAuthProviders] = useState({});
  const connectedPlatforms = useMemo(() => {
    const merged = new Set(persistedConnectedPlatforms);
    localConnectedPlatforms.forEach((platform) => merged.add(platform));
    return merged;
  }, [localConnectedPlatforms, persistedConnectedPlatforms]);
  const connectedFacebookFamily = connectedPlatforms.has("facebook") || connectedPlatforms.has("instagram");
  const selectedSocialCards = useMemo(() => {
    const selected = new Set(selectedPlatforms.map((item) => item.toLowerCase()));
    return SOCIAL_ACCOUNT_PLATFORMS.filter((platform) => selected.has(platform.id));
  }, [selectedPlatforms]);
  const selectedSubNicheCount = useMemo(
    () => Object.values(selectedSubNiches).reduce((total, values) => total + values.length, 0),
    [selectedSubNiches]
  );
  const hasConnectedSelectedSocial = useMemo(
    () =>
      selectedSocialCards.length > 0 &&
      selectedSocialCards.every((platform) => connectedPlatforms.has(platform.id)),
    [connectedPlatforms, selectedSocialCards]
  );
  const hasMinimumNiches = selectedNiches.length + selectedSubNicheCount >= 3;

  React.useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const pendingRaw = window.localStorage.getItem(PENDING_OAUTH_KEY);
    if (!pendingRaw) {
      return;
    }

    let pending = null;
    try {
      pending = JSON.parse(pendingRaw);
    } catch (_error) {
      window.localStorage.removeItem(PENDING_OAUTH_KEY);
      return;
    }

    if (!pending?.platform || !pending?.provider) {
      window.localStorage.removeItem(PENDING_OAUTH_KEY);
      return;
    }

    const linked = new Set(session?.linkedProviders || []);
    if (!linked.has(pending.provider) && session?.authProvider !== pending.provider) {
      return;
    }

    setConnectionError("");
    setLocalConnectedPlatforms((current) => {
      const next = new Set(current);
      next.add(pending.platform);
      return next;
    });
    setLocalOAuthProviders((current) => ({
      ...current,
      [pending.platform]: pending.provider
    }));
    window.localStorage.removeItem(PENDING_OAUTH_KEY);
  }, [connectSocialAccount, session?.authProvider, session?.email, session?.linkedProviders]);

  function togglePlatform(platform) {
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  }

  function toggleNiche(nicheId) {
    setSelectedNiches((current) => {
      if (current.includes(nicheId)) {
        const next = current.filter((item) => item !== nicheId);
        setSelectedSubNiches((subCurrent) => {
          const copy = { ...subCurrent };
          delete copy[nicheId];
          return copy;
        });
        return next;
      }
      return [...current, nicheId];
    });
  }

  function toggleSubNiche(nicheId, subNiche) {
    setSelectedSubNiches((current) => {
      const active = current[nicheId] || [];
      const nextValues = active.includes(subNiche)
        ? active.filter((item) => item !== subNiche)
        : [...active, subNiche];
      return {
        ...current,
        [nicheId]: nextValues
      };
    });
  }

  function getProviderForPlatform(platformId) {
    if (platformId === "youtube") return "google";
    if (platformId === "facebook" || platformId === "instagram") return "facebook";
    if (platformId === "github") return "github";
    if (platformId === "spotify") return "spotify";
    if (platformId === "linkedin") return "linkedin";
    if (platformId === "twitch") return "twitch";
    if (platformId === "discord") return "discord";
    return null;
  }

  function shouldShowAccountChoice(provider) {
    const linked = new Set(session?.linkedProviders || []);
    if (provider === "google") {
      return session?.authProvider === "google" || linked.has("google");
    }
    if (provider === "facebook") {
      return session?.authProvider === "facebook" || linked.has("facebook") || connectedFacebookFamily;
    }
    return false;
  }

  async function launchProviderOAuth(platform, provider, promptAnother = false) {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      Alert.alert("OAuth setup", "Provider OAuth account linking is currently enabled on web.");
      return;
    }

    window.localStorage.setItem(
      PENDING_OAUTH_KEY,
      JSON.stringify({
        platform: platform.id,
        provider,
        permissions: platform.permissions,
        name: platform.name
      })
    );
    window.localStorage.setItem(SKIP_INTENT_SELECTION_ONCE_KEY, "1");

    const googleScopes =
      "openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly";
    const queryParams = promptAnother ? { prompt: "select_account" } : { prompt: "consent" };
    if (provider === "google") {
      queryParams.access_type = "offline";
      queryParams.include_granted_scopes = "true";
    }

    const oauthOptions = {
      redirectTo: `${window.location.origin}/creator/onboarding`,
      scopes: provider === "google" ? googleScopes : undefined,
      queryParams
    };
    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        ...oauthOptions,
        skipBrowserRedirect: true
      }
    });

    if (error) {
      window.localStorage.removeItem(PENDING_OAUTH_KEY);
      throw error;
    }
    if (!data?.url) {
      const { error: fallbackError } = await supabase.auth.linkIdentity({
        provider,
        options: oauthOptions
      });
      if (fallbackError) {
        window.localStorage.removeItem(PENDING_OAUTH_KEY);
        throw fallbackError;
      }
      return;
    }

    const redirectUrl = new URL(data.url);
    if (provider === "google") {
      redirectUrl.searchParams.set("access_type", "offline");
      redirectUrl.searchParams.set("include_granted_scopes", "true");
      redirectUrl.searchParams.set("prompt", promptAnother ? "select_account" : "consent");
    }

    window.location.assign(redirectUrl.toString());
  }

  async function handleConnectPlatform(platform) {
    const provider = getProviderForPlatform(platform.id);
    if (!provider) {
      Alert.alert("Coming soon", `${platform.name} direct OAuth is not configured yet.`);
      return;
    }

    if (shouldShowAccountChoice(provider)) {
      setAccountChoice({ platform, provider });
      return;
    }

    setIsSubmitting(true);
    setConnectionError("");
    try {
      await launchProviderOAuth(platform, provider, false);
    } catch (error) {
      setConnectionError(error.message || "Connection failed. Please try again later.");
      setIsSubmitting(false);
    }
  }

  async function handleAccountChoice(choiceType) {
    if (!accountChoice?.platform || !accountChoice?.provider) {
      return;
    }

    setIsSubmitting(true);
    setConnectionError("");
    try {
      if (choiceType === "current") {
        setLocalConnectedPlatforms((current) => {
          const next = new Set(current);
          next.add(accountChoice.platform.id);
          return next;
        });
        setLocalOAuthProviders((current) => ({
          ...current,
          [accountChoice.platform.id]: accountChoice.provider
        }));
      } else {
        await launchProviderOAuth(accountChoice.platform, accountChoice.provider, true);
      }
      setAccountChoice(null);
    } catch (error) {
      const message = error.message || "Connection failed. Please try again later.";
      setConnectionError(message);
      Alert.alert("OAuth connection", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleContinue() {
    if (!selectedPlatforms.length) {
      Alert.alert("Creator onboarding", "Select at least one platform.");
      return;
    }
    if (!hasMinimumNiches) {
      Alert.alert("Creator onboarding", "Select at least 3 niches or subcategories.");
      return;
    }

    try {
      const selectedNicheTitles = YOUTUBE_NICHES.filter((niche) => selectedNiches.includes(niche.id)).map(
        (niche) => niche.title
      );
      await completeCreatorOnboarding({
        name: creatorName,
        platform: selectedPlatforms.join(", "),
        niche: selectedNicheTitles.join(", "),
        selectedNiches,
        selectedSubNiches
      });

      const selectedPlatformIds = selectedSocialCards.map((platform) => platform.id);
      const connectedSelectedIds = selectedPlatformIds.filter((platformId) => connectedPlatforms.has(platformId));
      for (const platformId of connectedSelectedIds) {
        const platformDefinition = SOCIAL_ACCOUNT_PLATFORMS.find((item) => item.id === platformId);
        if (!platformDefinition) {
          continue;
        }
        const oauthProvider = localOAuthProviders[platformId] || getProviderForPlatform(platformId);
        await connectSocialAccount({
          platform: platformId,
          username: session?.email || `${oauthProvider || platformId}-account`,
          oauthProvider: oauthProvider || undefined,
          permissions: platformDefinition.permissions
        });
      }

      navigation.replace("CreatorDashboard");
    } catch (error) {
      Alert.alert("Creator onboarding", error.message);
    }
  }

  return (
    <AppShell navigation={navigation} hideNavigation>
      <SectionHeader
        eyebrow="Creator setup"
        title="Set up your creator profile."
        body="Connect your social platforms to earn from brands."
      />

      <Card style={styles.card}>
        <InputField
          label="Creator name"
          placeholder="e.g. Julian Vane"
          value={creatorName}
          onChangeText={setCreatorName}
        />
        <View style={styles.platformField}>
          <Text style={styles.platformLabel}>Primary platform</Text>
          <View style={styles.chipWrap}>
            {PLATFORM_OPTIONS.map((platform) => {
              const selected = selectedPlatforms.includes(platform);
              return (
                <Pressable
                  key={platform}
                  onPress={() => togglePlatform(platform)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {platform}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.nicheField}>
          <Text style={styles.platformLabel}>Relevant niches (pick at least 3 total)</Text>
          <View style={styles.chipWrap}>
            {YOUTUBE_NICHES.map((niche) => {
              const selected = selectedNiches.includes(niche.id);
              return (
                <Pressable
                  key={niche.id}
                  onPress={() => toggleNiche(niche.id)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{niche.title}</Text>
                </Pressable>
              );
            })}
          </View>
          {selectedNiches.map((nicheId) => {
            const niche = YOUTUBE_NICHES.find((item) => item.id === nicheId);
            if (!niche) {
              return null;
            }
            return (
              <View key={niche.id} style={styles.subNicheGroup}>
                <Text style={styles.subNicheTitle}>{niche.title} subcategories</Text>
                <View style={styles.chipWrap}>
                  {niche.subcategories.map((subNiche) => {
                    const isSelected = (selectedSubNiches[niche.id] || []).includes(subNiche);
                    return (
                      <Pressable
                        key={`${niche.id}-${subNiche}`}
                        onPress={() => toggleSubNiche(niche.id, subNiche)}
                        style={[styles.subChip, isSelected && styles.chipSelected]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{subNiche}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
        {selectedSocialCards.length ? (
          <View style={styles.socialCards}>
            {selectedSocialCards.map((platform, index) => {
              const isConnected = connectedPlatforms.has(platform.id);

              return (
                <Animated.View
                  key={platform.id}
                  entering={FadeInUp.duration(420)
                    .delay(index * 80)
                    .withInitialValues({
                      opacity: 0,
                      transform: [{ translateY: 28 }]
                    })}
                >
                  <Card style={styles.socialCard}>
                    <View style={styles.socialIdentity}>
                      <View style={[styles.platformIcon, isConnected && styles.platformIconActive]}>
                        <Text style={styles.platformIconText}>{platform.icon}</Text>
                      </View>
                      <Text style={styles.socialTitle}>{platform.name}</Text>
                    </View>
                    <View style={styles.socialActions}>
                      {isConnected ? (
                        <View style={styles.connectedBadge}>
                          <Text style={styles.connectedBadgeText}>✓ Connected</Text>
                        </View>
                      ) : null}
                      <PrimaryButton
                        compact
                        label={isConnected ? "Reconnect" : "Connect account"}
                        onPress={() => handleConnectPlatform(platform)}
                      />
                    </View>
                  </Card>
                </Animated.View>
              );
            })}
          </View>
        ) : null}
        {connectionError ? <Text style={styles.errorText}>{connectionError}</Text> : null}
        <PrimaryButton
          disabled={!hasConnectedSelectedSocial || !hasMinimumNiches}
          label="Continue to dashboard"
          onPress={handleContinue}
        />
      </Card>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(accountChoice)}
        onRequestClose={() => setAccountChoice(null)}
      >
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Kicker>Account choice</Kicker>
            <Text style={styles.modalTitle}>Connect {accountChoice?.platform?.name || "account"}</Text>
            <BodyText>
              {accountChoice?.provider === "google"
                ? "Use your current Google account or add another Google account."
                : "Use your current Facebook-family account or add another account."}
            </BodyText>
            {connectionError ? <Text style={styles.errorText}>{connectionError}</Text> : null}
            <View style={styles.choiceActions}>
              <PrimaryButton
                label={session?.email ? `Use ${session.email}` : "Use current account"}
                onPress={() => handleAccountChoice("current")}
              />
              <SecondaryButton
                label={accountChoice?.provider === "google" ? "Add another Google account" : "Add another account"}
                onPress={() => handleAccountChoice("another")}
              />
              <SecondaryButton compact label="Cancel" onPress={() => setAccountChoice(null)} />
            </View>
          </Card>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = {
  card: {
    maxWidth: 560,
    gap: theme.spacing.md
  },
  platformField: {
    gap: 12
  },
  nicheField: {
    gap: 12
  },
  platformLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 18,
    lineHeight: 18,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.02)"
  },
  chipSelected: {
    borderColor: theme.colors.accentSoft,
    backgroundColor: "rgba(199, 54, 142, 0.22)"
  },
  subChip: {
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.015)"
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600"
  },
  chipTextSelected: {
    color: theme.colors.textPrimary
  },
  subNicheGroup: {
    gap: 8
  },
  subNicheTitle: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  socialCards: {
    gap: theme.spacing.sm
  },
  socialCard: {
    gap: theme.spacing.sm,
    borderColor: theme.colors.borderSubtle
  },
  socialIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  socialTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 34,
    lineHeight: 40
  },
  socialActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flexWrap: "wrap"
  },
  platformIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.bgSecondary
  },
  platformIconActive: {
    borderColor: "rgba(140,202,107,0.22)",
    backgroundColor: "rgba(31,85,0,0.26)"
  },
  platformIconText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 1.2
  },
  connectedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(31,85,0,0.26)"
  },
  connectedBadgeText: {
    color: theme.colors.successText,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  modalBackdrop: {
    flex: 1,
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(18,10,14,0.8)"
  },
  modalCard: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.accentBorder
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 32,
    lineHeight: 38
  },
  choiceActions: {
    gap: theme.spacing.sm
  },
  errorText: {
    color: theme.colors.errorText,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    lineHeight: 20
  }
};
