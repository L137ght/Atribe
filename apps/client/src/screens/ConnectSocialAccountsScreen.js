import React, { useMemo, useState } from "react";
import { Alert, Modal, Platform, Text, View } from "react-native";
import { useAppContext } from "../context";
import { SOCIAL_ACCOUNT_PLATFORMS } from "../data";
import { supabase } from "../lib";
import {
  AppShell,
  BodyText,
  Card,
  InputField,
  Kicker,
  PrimaryButton,
  SecondaryButton,
  SectionHeader
} from "../components";
import { theme } from "../theme";

const PENDING_OAUTH_KEY = "atribe.pending-social-oauth";

export default function ConnectSocialAccountsScreen({ navigation, route }) {
  const { connectSocialAccount, creatorSocialAccounts, currentCreator, session } = useAppContext();
  const origin = route?.params?.origin || "settings";
  const showAllPlatforms = route?.params?.showAll === true;
  const [activePlatform, setActivePlatform] = useState(null);
  const [accountChoice, setAccountChoice] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionError, setConnectionError] = useState("");

  const connectedPlatforms = useMemo(
    () => new Set((creatorSocialAccounts || []).map((account) => account.platform)),
    [creatorSocialAccounts]
  );
  const connectedFacebookFamily = connectedPlatforms.has("facebook") || connectedPlatforms.has("instagram");
  const onboardingSelectedPlatforms = useMemo(() => {
    const value = currentCreator?.platform || "";
    return value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }, [currentCreator?.platform]);
  const platformsToShow = useMemo(() => {
    if (origin !== "onboarding" || showAllPlatforms) {
      return SOCIAL_ACCOUNT_PLATFORMS;
    }

    const selected = new Set(onboardingSelectedPlatforms);
    const filtered = SOCIAL_ACCOUNT_PLATFORMS.filter((platform) => selected.has(platform.id));
    return filtered.length ? filtered : SOCIAL_ACCOUNT_PLATFORMS;
  }, [onboardingSelectedPlatforms, origin, showAllPlatforms]);

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

    setIsSubmitting(true);
    setConnectionError("");

    connectSocialAccount({
      platform: pending.platform,
      username: session?.email || `${pending.provider}-account`,
      oauthProvider: pending.provider,
      permissions: pending.permissions || []
    })
      .then(() => {
        window.localStorage.removeItem(PENDING_OAUTH_KEY);
        Alert.alert("Connected", `${pending.name || pending.platform} was connected successfully.`);
      })
      .catch((error) => {
        setConnectionError(error.message || "Connection failed. Please try again later.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [connectSocialAccount, session?.authProvider, session?.email, session?.linkedProviders]);

  function getProviderForPlatform(platformId) {
    if (platformId === "youtube") {
      return "google";
    }
    if (platformId === "facebook" || platformId === "instagram") {
      return "facebook";
    }
    if (platformId === "github") {
      return "github";
    }
    if (platformId === "spotify") {
      return "spotify";
    }
    if (platformId === "linkedin") {
      return "linkedin";
    }
    if (platformId === "twitch") {
      return "twitch";
    }
    if (platformId === "discord") {
      return "discord";
    }
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

  async function openConnectionModal(platform) {
    const provider = getProviderForPlatform(platform.id);
    if (provider && shouldShowAccountChoice(provider)) {
      setAccountChoice({ platform, provider });
      return;
    }

    if (provider) {
      setIsSubmitting(true);
      setConnectionError("");
      try {
        await launchProviderOAuth(platform, provider, false);
      } catch (error) {
        setConnectionError(error.message || "Connection failed. Please try again later.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setActivePlatform(platform);
    setUsername("");
    setPassword("");
    setConnectionError("");
  }

  function closeConnectionModal() {
    setActivePlatform(null);
    setUsername("");
    setPassword("");
    setConnectionError("");
    setIsSubmitting(false);
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

    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/creator/socials/connect`,
        queryParams: promptAnother ? { prompt: "select_account" } : {},
        skipBrowserRedirect: true
      }
    });

    if (error) {
      window.localStorage.removeItem(PENDING_OAUTH_KEY);
      throw error;
    }
    if (!data?.url) {
      window.localStorage.removeItem(PENDING_OAUTH_KEY);
      throw new Error("OAuth link URL was not returned.");
    }

    window.location.assign(data.url);
  }

  async function handleAccountChoice(choiceType) {
    if (!accountChoice?.platform || !accountChoice?.provider) {
      return;
    }

    setIsSubmitting(true);
    setConnectionError("");

    try {
      if (choiceType === "current") {
        await connectSocialAccount({
          platform: accountChoice.platform.id,
          username: session?.email || `${accountChoice.provider}-account`,
          oauthProvider: accountChoice.provider,
          permissions: accountChoice.platform.permissions
        });
        Alert.alert("Connected", `${accountChoice.platform.name} was connected successfully.`);
      } else {
        await launchProviderOAuth(accountChoice.platform, accountChoice.provider, true);
      }

      setAccountChoice(null);
    } catch (error) {
      setConnectionError(error.message || "Connection failed. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConnect() {
    if (!activePlatform) {
      return;
    }

    setIsSubmitting(true);
    setConnectionError("");

    try {
      await connectSocialAccount({
        platform: activePlatform.id,
        username,
        password,
        permissions: activePlatform.permissions
      });

      closeConnectionModal();
      Alert.alert("Connected", `${activePlatform.name} was connected successfully.`);
    } catch (error) {
      setConnectionError(error.message || "Connection failed. Please try again later.");
      setIsSubmitting(false);
    }
  }

  function handleSkip() {
    if (origin === "onboarding") {
      navigation.replace("CreatorDashboard");
      return;
    }
    navigation.goBack();
  }

  function handleContinue() {
    navigation.replace("CreatorDashboard");
  }

  return (
    <AppShell
      navigation={navigation}
      activeRoute="Settings"
      hideNavigation={origin === "onboarding"}
      title={origin === "onboarding" ? undefined : "Connect socials"}
      subtitle={origin === "onboarding" ? undefined : "Link your social profiles."}
    >
      <SectionHeader
        eyebrow={origin === "onboarding" ? "Creator flow" : "Creator identity"}
        title="Connect social accounts"
        body={
          origin === "onboarding"
            ? "Connect the profiles you want to use with Atribe. You can also skip and do this later."
            : "Connect the profiles you want to use with Atribe."
        }
      />

      <View style={styles.list}>
        {platformsToShow.map((platform) => {
          const isConnected = connectedPlatforms.has(platform.id);
          return (
            <Card key={platform.id} style={styles.platformCard}>
              <View style={styles.platformIdentity}>
                <View style={[styles.platformIcon, isConnected && styles.platformIconActive]}>
                  <Text style={styles.platformIconText}>{platform.icon}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.platformTitle}>{platform.name}</Text>
                  {origin !== "onboarding" ? (
                    <View style={styles.permissionRow}>
                      {platform.permissions.slice(0, 3).map((permission) => (
                        <View key={permission} style={styles.permissionPill}>
                          <Text style={styles.permissionPillText}>{permission}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.platformActions}>
                {isConnected ? (
                  <View style={styles.connectedBadge}>
                    <Text style={styles.connectedBadgeText}>✓ Connected</Text>
                  </View>
                ) : null}
                <PrimaryButton
                  compact
                  label={isConnected ? "Reconnect" : "Connect account"}
                  onPress={() => openConnectionModal(platform)}
                />
              </View>
            </Card>
          );
        })}
        {origin === "onboarding" && !showAllPlatforms ? (
          <SecondaryButton
            label="Add another social account"
            onPress={() => navigation.push("ConnectSocialAccounts", { origin: "settings", showAll: true })}
          />
        ) : null}
      </View>

      <View style={styles.footerActions}>
        <SecondaryButton label={origin === "onboarding" ? "Skip for now" : "Back"} onPress={handleSkip} />
        {origin === "onboarding" ? (
          <PrimaryButton label="Continue to dashboard" onPress={handleContinue} />
        ) : null}
      </View>

      <Modal animationType="fade" transparent visible={Boolean(activePlatform)} onRequestClose={closeConnectionModal}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Kicker>OAuth Preview</Kicker>
            <Text style={styles.modalTitle}>Connect {activePlatform?.name || "account"}</Text>
            <BodyText>Sign in to grant access to profile data and analytics for your audience.</BodyText>

            <InputField
              label="Login"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="@handle or email"
              value={username}
              onChangeText={setUsername}
            />
            <InputField
              label="Password"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
            />

            <View style={styles.permissionBlock}>
              <Text style={styles.permissionTitle}>Permissions requested</Text>
              {(activePlatform?.permissions || []).map((permission) => (
                <BodyText key={permission} style={styles.permissionItem}>
                  • {permission}
                </BodyText>
              ))}
            </View>

            {connectionError ? <Text style={styles.errorText}>{connectionError}</Text> : null}

            <View style={styles.modalActions}>
              <SecondaryButton compact label="Cancel" onPress={closeConnectionModal} />
              <PrimaryButton compact label={isSubmitting ? "Connecting..." : "Authorize"} onPress={handleConnect} />
            </View>
          </Card>
        </View>
      </Modal>

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
  list: {
    gap: theme.spacing.md
  },
  platformCard: {
    backgroundColor: theme.colors.surfaceElevated,
    gap: theme.spacing.md,
    borderColor: theme.colors.borderSubtle
  },
  platformIdentity: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    flex: 1
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
  platformTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34
  },
  permissionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  permissionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.bgSecondary
  },
  permissionPillText: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  platformActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.sm
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
  footerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: theme.spacing.sm
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
  permissionBlock: {
    gap: 6,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle
  },
  permissionTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  permissionItem: {
    color: theme.colors.textPrimary
  },
  errorText: {
    color: theme.colors.errorText,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    lineHeight: 20
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  choiceActions: {
    gap: theme.spacing.sm
  }
};
