import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Text, View, useWindowDimensions } from "react-native";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  EditorialHero,
  InputField,
  PrimaryButton
} from "../components";
import {
  getGoogleAuthConfig,
  isGoogleAuthConfigured
} from "../utils";
import { theme } from "../theme";

WebBrowser.maybeCompleteAuthSession();

function showMessage(title, message) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

export default function LoginScreen({ navigation }) {
  const {
    isConfigured: isSupabaseConfigured,
    signInAsDemo,
    signInWithGoogle,
    signInWithGoogleOAuth,
    signInWithPassword,
    t
  } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { width } = useWindowDimensions();
  const isCompact = width < 980;
  const googleConfig = useMemo(() => {
    const config = getGoogleAuthConfig();

    if (Platform.OS !== "web") {
      config.redirectUri = makeRedirectUri({
        native: "com.atribe.io:/oauthredirect"
      });
    }

    return config;
  }, []);
  const isGoogleConfigured = isGoogleAuthConfigured(googleConfig);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleConfig);

  const demoAccounts = [
    {
      email: "supporter@atribe.app",
      label: t("login.shopperDemo", "Use shopper demo"),
      password: "AtribeDemo123!"
    },
    {
      email: "creator@atribe.app",
      label: t("login.creatorDemo", "Use creator demo"),
      password: "AtribeDemo123!"
    }
  ];

  useEffect(() => {
    async function handleAuthResponse() {
      if (!response) {
        return;
      }

      if (response.type === "dismiss" || response.type === "cancel") {
        showMessage(
          t("login.alerts.googleTitle", "Google Login"),
          t("login.alerts.googleCanceled", "Google sign-in was canceled.")
        );
        return;
      }

      if (response.type === "error") {
        showMessage(
          t("login.alerts.googleTitle", "Google Login"),
          response.error?.message ||
            t("login.alerts.googleFailed", "Google sign-in failed. Check OAuth client settings.")
        );
        return;
      }

      if (response.type !== "success") {
        return;
      }

      const idToken = response.params?.id_token || response.authentication?.idToken;
      const accessToken = response.params?.access_token || response.authentication?.accessToken;

      if (!idToken) {
        showMessage(
          t("login.alerts.googleTitle", "Google Login"),
          t("login.alerts.googleNoIdToken", "Google did not return an ID token.")
        );
        return;
      }

      setIsSubmitting(true);

      try {
        await signInWithGoogle({
          accessToken,
          idToken,
          nonce: request?.nonce
        });
        navigation.replace("IntentSelection");
      } catch (error) {
        showMessage(t("login.alerts.googleTitle", "Google Login"), error.message);
      } finally {
        setIsSubmitting(false);
      }
    }

    handleAuthResponse();
  }, [request?.nonce, response, signInWithGoogle, t]);

  async function handleLogin() {
    if (!isSupabaseConfigured) {
      showMessage(
        t("login.alerts.supabaseTitle", "Supabase setup"),
        t(
          "login.alerts.supabaseBody",
          "Add your Supabase URL and publishable key to .env.local before signing in."
        )
      );
      return;
    }

    if (!isGoogleConfigured) {
      showMessage(
        t("login.alerts.googleTitle", "Google Login"),
        t(
          "login.alerts.googleConfigBody",
          "Add your Google OAuth client IDs in app.json under expo.extra before signing in."
        )
      );
      return;
    }

    try {
      if (Platform.OS === "web") {
        await signInWithGoogleOAuth({
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined
        });
        return;
      }

      if (!request) {
        showMessage(
          t("login.alerts.googleTitle", "Google Login"),
          t("login.alerts.googleLoading", "Google sign-in is still loading. Please try again.")
        );
        return;
      }

      await promptAsync();
    } catch (error) {
      showMessage(
        t("login.alerts.googleTitle", "Google Login"),
        error?.message || t("login.alerts.googleUnable", "Unable to start Google login.")
      );
    }
  }

  async function handlePasswordLogin(nextEmail = email, nextPassword = password) {
    const normalizedEmail = nextEmail.trim().toLowerCase();
    const demoAccount = demoAccounts.find((account) => account.email === normalizedEmail);

    if (demoAccount && nextPassword === demoAccount.password) {
      setIsSubmitting(true);

      try {
        await signInAsDemo(normalizedEmail.includes("creator") ? "creator" : "supporter");
        navigation.replace("IntentSelection");
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (!isSupabaseConfigured) {
      showMessage(
        t("login.alerts.supabaseTitle", "Supabase setup"),
        t(
          "login.alerts.supabaseBody",
          "Add your Supabase URL and publishable key to .env.local before signing in."
        )
      );
      return;
    }

    if (!nextEmail.trim() || !nextPassword) {
      showMessage(
        t("login.alerts.emailTitle", "Email login"),
        t("login.alerts.emailMissing", "Enter an email and password.")
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await signInWithPassword({
        email: normalizedEmail,
        password: nextPassword
      });
      navigation.replace("IntentSelection");
    } catch (error) {
      showMessage(t("login.alerts.emailTitle", "Email login"), error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <View style={[styles.layout, isCompact && styles.layoutCompact]}>
        <View style={styles.copyPane}>
          <EditorialHero
            title={t("login.heroTitle", "Back the creators you love.")}
            body={t("login.heroBody", "Shop Better Deals. No extra cost.")}
          />
        </View>

        <Card style={[styles.card, isCompact && styles.cardCompact]}>
          <Text style={styles.cardTitle}>{t("login.welcome", "Welcome")}</Text>
          <BodyText>{t("login.continue", "Sign in to continue")}</BodyText>

          <PrimaryButton
            label={
              isSubmitting
                ? t("login.signingIn", "Signing in...")
                : !request
                  ? t("login.preparingGoogle", "Preparing Google...")
                  : t("login.continueWithGoogle", "Continue with Google")
            }
            onPress={handleLogin}
            variant="gradient"
            style={{ marginTop: 8 }}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("login.orUseEmail", "or use email")}</Text>
            <View style={styles.dividerLine} />
          </View>

          <InputField
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            label={t("login.emailAddress", "Email address")}
            placeholder="supporter@atribe.app"
            value={email}
            onChangeText={setEmail}
          />

          <InputField
            autoCapitalize="none"
            autoCorrect={false}
            label={t("login.password", "Password")}
            placeholder="AtribeDemo123!"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <PrimaryButton
            label={
              isSubmitting
                ? t("login.signingIn", "Signing in...")
                : t("login.signInWithEmail", "Sign in with email")
            }
            onPress={() => handlePasswordLogin()}
            variant="gradient"
          />

          <View style={styles.demoStack}>
            {demoAccounts.map((account) => (
              <View key={account.email} style={styles.demoRow}>
                <BodyText style={{ flex: 1 }}>
                  {account.email}
                </BodyText>
                <PrimaryButton
                  compact
                  label={account.label}
                  variant="gradient"
                  onPress={async () => {
                    setEmail(account.email);
                    setPassword(account.password);
                    setIsSubmitting(true);

                    try {
                      await signInAsDemo(account.email.includes("creator") ? "creator" : "supporter");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                />
              </View>
            ))}
          </View>

          {isSubmitting ? (
            <ActivityIndicator color={theme.colors.accentSoft} />
          ) : null}
        </Card>
      </View>
    </AppShell>
  );
}

const styles = {
  layout: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xl
  },
  layoutCompact: {
    gap: theme.spacing.lg
  },
  copyPane: {
    flex: 1,
    minWidth: 320,
    maxWidth: 620
  },
  card: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center"
  },
  cardCompact: {
    maxWidth: 620
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 36,
    lineHeight: 42
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderSubtle
  },
  dividerText: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  demoStack: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs
  },
  demoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  }
};
