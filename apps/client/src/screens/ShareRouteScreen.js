import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  Kicker,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  ShoppingIntelCard
} from "../components";
import { theme } from "../theme";
import {
  extractDeepLinkShareUrl,
  extractFirstValidUrl,
  getDomainFromUrl
} from "../utils";
import { analyzeShoppingLink, buildSupporterRouteUrl, isAtribeBackendConfigured } from "../lib";

export default function ShareRouteScreen({ navigation, route }) {
  const {
    intent,
    recordRoutingEvent,
    session
  } = useAppContext();
  const [isLoading, setIsLoading] = useState(true);
  const [routingResult, setRoutingResult] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const sharedUrl = useMemo(() => {
    const routeUrlParam = route?.params?.url || "";
    const deepLinkedUrl = extractDeepLinkShareUrl(routeUrlParam);

    return deepLinkedUrl || extractFirstValidUrl(routeUrlParam) || "";
  }, [route?.params?.url]);
  useEffect(() => {
    let isMounted = true;

    async function routeSharedLink() {
      if (!isMounted) {
        return;
      }

      setIsLoading(true);

      let nextResult;
      try {
        let nextAnalysis = null;
        let nextAnalysisError = "";

        try {
          nextAnalysis = await analyzeShoppingLink(sharedUrl);
        } catch {
          nextAnalysisError = "We couldn’t analyze this yet, but you can still shop with creator support.";
        }

        nextResult = {
          status: "ready",
          reason: "backend-route",
          domain: getDomainFromUrl(sharedUrl),
          originalUrl: sharedUrl,
          routedUrl: buildSupporterRouteUrl({
            userId: session?.id || "",
            destinationUrl: sharedUrl
          }),
          analysis: nextAnalysis,
          analysisError: nextAnalysisError
        };
      } catch (error) {
        nextResult = {
          status: "unsupported",
          reason: "routing-error",
          originalUrl: sharedUrl,
          errorMessage: error.message
        };
      }

      if (isMounted) {
        setAnalysis(nextResult.analysis || null);
        setAnalysisError(nextResult.analysisError || "");
        setRoutingResult(nextResult);
        setIsLoading(false);
      }
    }

    routeSharedLink();

    return () => {
      isMounted = false;
    };
  }, [session?.id, sharedUrl]);

  async function handleOpenRoutedLink() {
    if (!routingResult?.routedUrl) {
      return;
    }

    try {
      await recordRoutingEvent({
        creatorId: null,
        destinationUrl: routingResult.originalUrl,
        domain: routingResult.domain,
        generatedUrl: routingResult.routedUrl,
        openedAt: new Date().toISOString()
      });

      if (Platform.OS === "web") {
        window.location.assign(routingResult.routedUrl);
        return;
      }

      navigation.navigate("WebViewScreen", {
        initialUrl: routingResult.routedUrl
      });
    } catch (error) {
      Alert.alert("Open routed link", "We couldn't open the routed link just now.");
    }
  }

  async function handleCopyLink() {
    if (!routingResult?.routedUrl) {
      return;
    }

    try {
      await Clipboard.setStringAsync(routingResult.routedUrl);
      Alert.alert("Copied", "The routed link is on your clipboard.");
    } catch (error) {
      Alert.alert("Copy link", "We couldn't copy the routed link just now.");
    }
  }

  function renderContent() {
    if (!sharedUrl || route?.params?.unsupported || routingResult?.reason === "invalid-url") {
      return (
        <Card style={styles.primaryCard}>
          <Kicker>Unsupported</Kicker>
          <Text style={styles.cardTitle}>We can&apos;t route this link yet.</Text>
          <BodyText>
            Share a product page URL or plain text that contains a valid link from Amazon,
            Flipkart, Safari, Chrome, or another supported source.
          </BodyText>
        </Card>
      );
    }

    if (!session) {
      return (
        <Card style={styles.primaryCard}>
          <Kicker>Sign in</Kicker>
          <Text style={styles.cardTitle}>Sign in to route shared links.</Text>
          <BodyText>
            Atribe needs your saved creator selections before it can apply routing.
          </BodyText>
          <PrimaryButton label="Continue to login" onPress={() => navigation.navigate("Login")} />
        </Card>
      );
    }

    if (session.mode === "demo") {
      return (
        <Card style={styles.primaryCard}>
          <Kicker>Backend required</Kicker>
          <Text style={styles.cardTitle}>Use a signed-in account for routed links.</Text>
          <BodyText>
            Shopping links cannot be generated while using a demo account.
          </BodyText>
        </Card>
      );
    }

    if (!intent) {
      return (
        <Card style={styles.primaryCard}>
          <Kicker>Set up</Kicker>
          <Text style={styles.cardTitle}>Choose your role first.</Text>
          <BodyText>
            We need your app mode before we can route incoming links reliably.
          </BodyText>
          <PrimaryButton
            label="Choose role"
            onPress={() => navigation.navigate("IntentSelection")}
          />
        </Card>
      );
    }

    if (!isAtribeBackendConfigured) {
      return (
        <Card style={styles.primaryCard}>
          <Kicker>Configuration</Kicker>
          <Text style={styles.cardTitle}>Backend routing is not configured.</Text>
          <BodyText>
            Shopping links are currently unavailable in this build.
          </BodyText>
        </Card>
      );
    }

    if (routingResult?.status === "unsupported") {
      return (
        <Card style={styles.primaryCard}>
          <Kicker>Routing</Kicker>
          <Text style={styles.cardTitle}>We couldn&apos;t prepare the support link.</Text>
          <BodyText>
            {routingResult?.errorMessage || "This shared content did not include a supported product URL."}
          </BodyText>
        </Card>
      );
    }

    return (
      <View style={styles.grid}>
        <Card style={styles.primaryCard}>
          <Kicker>Ready</Kicker>
          <Text style={styles.cardTitle}>Ready to support your creators.</Text>
          <BodyText>
            Atribe will open a support-ready shopping link first, then send you to the store page.
          </BodyText>

          <View style={styles.detailList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Original domain</Text>
              <Text style={styles.detailValue}>{routingResult?.domain || "Unknown"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Support link</Text>
              <Text numberOfLines={4} style={styles.linkPreview}>
                {routingResult?.routedUrl || routingResult?.originalUrl}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <PrimaryButton compact label="Open routed link" onPress={handleOpenRoutedLink} />
            <SecondaryButton compact label="Copy link" onPress={handleCopyLink} />
          </View>
        </Card>

        <View style={styles.sideColumn}>
          <ShoppingIntelCard
            analysis={analysis}
            fallbackMessage={analysisError || "We couldn’t analyze this yet, but you can still shop with creator support."}
            onPrimaryPress={handleOpenRoutedLink}
            onSecondaryPress={() => navigation.goBack()}
            secondaryLabel="Close"
            secondaryTone="text"
          />

          <Card style={styles.sideCard}>
            <Text style={styles.sideTitle}>Shared source</Text>
            <BodyText>
              {route?.params?.source === "share-intent"
                ? "Opened from the system share sheet."
                : "Opened from a deep link."}
            </BodyText>
            {routingResult?.reason === "protected-path" ? (
              <BodyText style={styles.noteText}>
                This looks like a cart, checkout, or payment path, so Atribe preserved the original
                URL instead of rewriting it.
              </BodyText>
            ) : null}
          </Card>
        </View>
      </View>
    );
  }

  return (
    <AppShell
      activeRoute={intent === "creator" ? "CreatorDashboard" : "Home"}
      navigation={navigation}
    >
      <SectionHeader
        eyebrow="Share sheet"
        title="Route this link"
        body="Check the buy signals first, then continue with creator support."
      />

      {isLoading ? (
        <Card style={styles.primaryCard}>
          <Kicker>Checking</Kicker>
          <Text style={styles.cardTitle}>Preparing your link.</Text>
          <BodyText>We&apos;re validating the shared URL and checking the product before routing it.</BodyText>
        </Card>
      ) : (
        renderContent()
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 30,
    lineHeight: 36
  },
  detailLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  detailList: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg
  },
  detailRow: {
    gap: theme.spacing.xs
  },
  detailValue: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 17,
    lineHeight: 24
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.lg
  },
  linkPreview: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    lineHeight: 22
  },
  noteText: {
    marginTop: theme.spacing.md
  },
  primaryCard: {
    flex: 1,
    gap: theme.spacing.md,
    minWidth: 320
  },
  sideCard: {
    gap: theme.spacing.sm,
    width: 320
  },
  sideColumn: {
    gap: theme.spacing.lg,
    width: 320
  },
  sideTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    lineHeight: 30
  }
});
