import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useAppContext } from "../context";
import {
  analyzeShoppingLink,
  buildSupporterRouteUrl,
  fetchPriceHistory,
  isAtribeBackendConfigured,
  isPriceHistorySupportedDomain,
  rewriteAmazonUrl
} from "../lib";
import {
  AppShell,
  BodyText,
  Card,
  InputField,
  PriceHistoryCard,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  ShareSupportForm,
  ShoppingIntelCard,
  SupportScoreCard,
  SupporterRewardsPanel
} from "../components";
import { theme } from "../theme";
import { getDomainFromUrl, TUTORIAL_STEPS } from "../utils";

function getQueryParam(url, paramName) {
  try {
    return new URL(String(url || "").trim()).searchParams.get(paramName) || "";
  } catch {
    return "";
  }
}

export default function HomeScreen({ navigation }) {
  const {
    currentTutorialStep,
    distributionMode,
    intent,
    recordRoutingEvent,
    session,
    skipTutorial,
    tutorialActive,
    tribeCreators
  } = useAppContext();
  const { width } = useWindowDimensions();
  const [destinationUrl, setDestinationUrl] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [tutorialPage, setTutorialPage] = useState(0);
  const [homeMode, setHomeMode] = useState("shop");
  const [selectedShareCreatorId, setSelectedShareCreatorId] = useState(null);
  const [supportDataRefreshKey, setSupportDataRefreshKey] = useState(0);
  const tutorialScrollRef = useRef(null);
  const tutorialModalWidth = Math.min(width - 24, 780);
  const tutorialSlideWidth = tutorialModalWidth - theme.spacing.xl * 2;
  const detectedDomain = useMemo(() => getDomainFromUrl(destinationUrl), [destinationUrl]);
  const supportsPriceHistory = useMemo(
    () => isPriceHistorySupportedDomain(destinationUrl),
    [destinationUrl]
  );
  const [priceHistoryState, setPriceHistoryState] = useState({
    status: "idle",
    data: null,
    error: null
  });
  const priceHistoryAbortRef = useRef(null);
  const rewriteConfig = useMemo(() => {
    if (!detectedDomain) {
      return {
        amazonTag: tribeCreators.find((creator) => creator.affiliateTag)?.affiliateTag || "creator-a-21",
        flipkartAffid: ""
      };
    }

    const matchingCreator = tribeCreators.find((creator) =>
      creator.links?.some((link) => getDomainFromUrl(`https://${link.domain}`) === detectedDomain)
    );
    const matchingLink = matchingCreator?.links?.find(
      (link) => getDomainFromUrl(`https://${link.domain}`) === detectedDomain
    );

    return {
      amazonTag:
        matchingCreator?.affiliateTag ||
        tribeCreators.find((creator) => creator.affiliateTag)?.affiliateTag ||
        "creator-a-21",
      flipkartAffid: getQueryParam(matchingLink?.url, "affid")
    };
  }, [detectedDomain, tribeCreators]);

  async function handleGenerateRoute() {
    try {
      if (!destinationUrl.trim()) {
        setValidationError("Paste a shopping link first.");
        throw new Error("Paste a shopping link first.");
      }

      if (!detectedDomain) {
        setValidationError("Enter a valid shopping link, including https://");
        throw new Error("Enter a valid shopping link, including https://");
      }

      setValidationError("");

      if (!session?.id || session.mode === "demo") {
        throw new Error("Sign in with a non-demo account to use backend routing.");
      }

      if (!isAtribeBackendConfigured) {
        throw new Error("Backend routing is not configured. Set EXPO_PUBLIC_ATRIBE_BACKEND_URL.");
      }

      const routedUrl = buildSupporterRouteUrl({
        userId: session.id,
        destinationUrl
      });
      const rewrittenUrl = rewriteAmazonUrl(routedUrl, rewriteConfig);

      await recordRoutingEvent({
        creatorId: tribeCreators[0]?.id || null,
        destinationUrl,
        domain: detectedDomain,
        generatedUrl: rewrittenUrl,
        openedAt: new Date().toISOString()
      });

      if (Platform.OS === "web") {
        window.location.assign(rewrittenUrl);
        return;
      }

      navigation.navigate("WebViewScreen", {
        initialUrl: rewrittenUrl
      });
    } catch (error) {
      Alert.alert("Shopping link", error.message);
    }
  }

  const heroTitle =
    intent === "creator"
      ? "Shop through your creator links."
      : homeMode === "share"
      ? "Share creator content"
      : "Check before you buy. Support your creators.";

  const heroSubtitle = homeMode === "share"
    ? "Paste a YouTube, Instagram, or X link from a creator you support. We'll create a share link so your support counts."
    : undefined;

  const tabActions = [
    { id: "shop", label: "Shop" },
    { id: "share", label: "Share" },
  ];

  useEffect(() => {
    let cancelled = false;
    const trimmedUrl = destinationUrl.trim();

    if (!trimmedUrl) {
      setAnalysis(null);
      setAnalysisError("");
      setValidationError("");
      setIsAnalyzing(false);
      return undefined;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      setAnalysis(null);
      setAnalysisError("");
      setIsAnalyzing(false);
      setValidationError("Enter a valid shopping link, including https://");
      return undefined;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setAnalysis(null);
      setAnalysisError("");
      setIsAnalyzing(false);
      setValidationError("Enter a valid shopping link, including https://");
      return undefined;
    }

    setValidationError("");
    setIsAnalyzing(true);

    analyzeShoppingLink(trimmedUrl)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setAnalysis(result);
        setAnalysisError("");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setAnalysis(null);
        setAnalysisError("We couldn’t analyze this yet, but you can still shop with creator support.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsAnalyzing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [destinationUrl]);

  useEffect(() => {
    const trimmedUrl = destinationUrl.trim();

    if (!trimmedUrl || !supportsPriceHistory) {
      setPriceHistoryState({ status: "idle", data: null, error: null });
      return undefined;
    }

    let cancelled = false;
    const abortController = new AbortController();

    if (priceHistoryAbortRef.current) {
      priceHistoryAbortRef.current.abort();
    }
    priceHistoryAbortRef.current = abortController;

    setPriceHistoryState({ status: "loading", data: null, error: null });

    const debounceTimer = setTimeout(async () => {
      if (cancelled) return;

      try {
        const result = await fetchPriceHistory(trimmedUrl, {
          signal: abortController.signal
        });

        if (cancelled) return;

        setPriceHistoryState({
          status: result.status === "success" ? "success" : result.status === "empty" ? "empty" : "error",
          data: result.data || null,
          error: null
        });
      } catch (error) {
        if (cancelled || error.name === "AbortError") return;

        setPriceHistoryState({ status: "error", data: null, error: null });
      }
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      abortController.abort();
    };
  }, [destinationUrl, supportsPriceHistory]);

  async function handleTutorialDismiss() {
    await skipTutorial();
    setTutorialPage(0);
    tutorialScrollRef.current?.scrollTo?.({ x: 0, y: 0, animated: false });
  }

  useEffect(() => {
    if (!(tutorialActive && currentTutorialStep?.screen === "Home")) {
      return;
    }

    setTutorialPage(0);
    tutorialScrollRef.current?.scrollTo?.({ x: 0, y: 0, animated: false });
  }, [tutorialActive, currentTutorialStep?.screen]);

  return (
    <AppShell navigation={navigation} activeRoute="Home">
      <SectionHeader eyebrow="Shopping support" title={heroTitle} />
      {heroSubtitle ? <BodyText style={styles.heroSubtitle}>{heroSubtitle}</BodyText> : null}

      <Modal
        animationType="slide"
        visible={tutorialActive && currentTutorialStep?.screen === "Home"}
        transparent
        onRequestClose={handleTutorialDismiss}
      >
        <View style={styles.tutorialModalBackdrop}>
          <View
            style={[styles.tutorialModalCard, { width: tutorialModalWidth }]}
          >
            <View style={styles.tutorialModalHeader}>
              <Text style={styles.tutorialKicker}>First Login Guide</Text>
              <Pressable onPress={handleTutorialDismiss}>
                <Text style={styles.tutorialSkipText}>Skip</Text>
              </Pressable>
            </View>

            <ScrollView
              ref={tutorialScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ width: tutorialSlideWidth }}
              onMomentumScrollEnd={(event) => {
                const nextPage = Math.round(
                  event.nativeEvent.contentOffset.x / tutorialSlideWidth
                );
                setTutorialPage(
                  Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, nextPage))
                );
              }}
            >
              {TUTORIAL_STEPS.map((step) => (
                <View
                  key={step.id}
                  style={[styles.tutorialSlide, { width: tutorialSlideWidth }]}
                >
                  <Text style={styles.tutorialTitle}>{step.title}</Text>
                  <BodyText>{step.body}</BodyText>
                  <View style={styles.tutorialPoints}>
                    {step.points.map((point) => (
                      <BodyText
                        key={`${step.id}-${point}`}
                        style={styles.tutorialPoint}
                      >
                        • {point}
                      </BodyText>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.tutorialFooter}>
              <View style={styles.tutorialProgressWrap}>
                <Text style={styles.tutorialProgress}>
                  {tutorialPage + 1}/{TUTORIAL_STEPS.length}
                </Text>
              </View>
              <PrimaryButton
                compact
                label={
                  tutorialPage === TUTORIAL_STEPS.length - 1
                    ? "Finish tutorial"
                    : "Continue"
                }
                onPress={
                  tutorialPage === TUTORIAL_STEPS.length - 1
                    ? handleTutorialDismiss
                    : () => {
                        const nextPage = Math.min(
                          TUTORIAL_STEPS.length - 1,
                          tutorialPage + 1
                        );
                        tutorialScrollRef.current?.scrollTo?.({
                          x: nextPage * tutorialSlideWidth,
                          y: 0,
                          animated: true
                        });
                        setTutorialPage(nextPage);
                      }
                }
              />
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.layout}>
        <Card style={styles.mainCard}>
          <View style={styles.tabRow}>
            {tabActions.map((tab) => (
              <SecondaryButton
                key={tab.id}
                compact
                label={tab.label}
                selected={homeMode === tab.id}
                onPress={() => setHomeMode(tab.id)}
              />
            ))}
          </View>

          {homeMode === "shop" ? (
            <>
              <InputField
                label="Paste a shopping link"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://amazon.com/product-id"
                value={destinationUrl}
                onChangeText={setDestinationUrl}
              />

              {detectedDomain ? (
                <View style={styles.domainTag}>
                  <Text style={styles.domainTagText}>
                    Detected: {detectedDomain}
                  </Text>
                </View>
              ) : null}

              {validationError ? (
                <BodyText style={styles.validationError}>{validationError}</BodyText>
              ) : null}

              {destinationUrl.trim() && !validationError ? (
                <>
                  <ShoppingIntelCard
                    analysis={analysis}
                    fallbackMessage={
                      isAnalyzing
                        ? "Checking this product before you shop."
                        : analysisError
                    }
                    onPrimaryPress={handleGenerateRoute}
                    onSecondaryPress={() => {
                      setDestinationUrl("");
                      setAnalysis(null);
                      setAnalysisError("");
                      setValidationError("");
                      setPriceHistoryState({ status: "idle", data: null, error: null });
                    }}
                    disabled={isAnalyzing}
                  />
                  {supportsPriceHistory ? (
                    <PriceHistoryCard
                      data={priceHistoryState.data}
                      state={priceHistoryState.status}
                      onViewFullPage={(url) => {
                        if (Platform.OS === "web") {
                          window.open(url, "_blank");
                        } else {
                          Linking.openURL(url);
                        }
                      }}
                    />
                  ) : null}
                </>
              ) : null}

              {!destinationUrl.trim() ? (
                <PrimaryButton
                  label="Support and continue"
                  onPress={handleGenerateRoute}
                />
              ) : null}

              {!isAtribeBackendConfigured ? (
                <BodyText>
                  Shopping features are currently unavailable in this build.
                </BodyText>
              ) : null}
            </>
          ) : (
            <>
              {tribeCreators.length > 0 ? (
                <View style={styles.creatorPicker}>
                  <Text style={styles.creatorPickerLabel}>Supporting creator</Text>
                  <View style={styles.creatorPickerRow}>
                    {tribeCreators.map((creator) => (
                      <SecondaryButton
                        key={creator.id}
                        compact
                        label={creator.name}
                        selected={selectedShareCreatorId === creator.id}
                        onPress={() => setSelectedShareCreatorId(creator.id)}
                      />
                    ))}
                  </View>
                </View>
              ) : (
                <BodyText style={{ color: theme.colors.textMuted }}>
                  Add creators to your tribe before creating share links.
                </BodyText>
              )}

              <ShareSupportForm
                selectedCreatorId={selectedShareCreatorId}
                onCreated={() => setSupportDataRefreshKey((current) => current + 1)}
              />
            </>
          )}

          <Card style={styles.routingSummaryCard}>
            <Text style={styles.summaryKicker}>Your support setup</Text>
            <Text style={styles.summaryValue}>{tribeCreators.length}</Text>
            <BodyText>
              {tribeCreators.length === 1
                ? "Your purchase can support 1 creator when you continue shopping."
                : `Your purchase can support ${tribeCreators.length} creators when you continue shopping.`}
            </BodyText>
          </Card>

          <View style={styles.tribeBlock}>
            <View style={styles.tribeHeader}>
              <View style={{ gap: 4, flex: 1 }}>
                <Text style={styles.tribeTitle}>Creators</Text>
                <BodyText>
                  {tribeCreators.length
                    ? "Your shopping link will support these creators."
                    : "Add creators before opening a shopping link."}
                </BodyText>
              </View>
              <SecondaryButton
                compact
                label="Add creator"
                onPress={() => navigation.navigate("CreatorDiscovery")}
              />
            </View>

            {tribeCreators.length ? (
              tribeCreators.map((creator) => (
                <View key={creator.id} style={styles.tribeRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.creatorName}>{creator.name}</Text>
                    <Text style={styles.creatorMeta}>
                      {creator.niche || creator.platform}
                      {distributionMode === "weighted"
                        ? ` · weight ${creator.weight}%`
                        : " · even split"}
                    </Text>
                  </View>
                  <SecondaryButton
                    compact
                    label="Edit"
                    onPress={() => navigation.navigate("CreatorSelection")}
                  />
                </View>
              ))
            ) : (
              <BodyText>No creators selected yet.</BodyText>
            )}
          </View>
        </Card>

        <View style={styles.sideColumn}>
          <SupportScoreCard refreshKey={supportDataRefreshKey} />
          <SupporterRewardsPanel
            creators={tribeCreators}
            refreshKey={supportDataRefreshKey}
            onClaimed={() => setSupportDataRefreshKey((current) => current + 1)}
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
  mainCard: {
    flex: 1,
    minWidth: 320
  },
  sideColumn: {
    width: 280,
    minWidth: 260,
    gap: theme.spacing.md,
  },
  tabRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  heroSubtitle: {
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  creatorPicker: {
    gap: theme.spacing.sm,
  },
  creatorPickerLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  creatorPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  domainTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(143,1,100,0.16)"
  },
  domainTagText: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  validationError: {
    color: theme.colors.errorText
  },
  routingSummaryCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    gap: theme.spacing.sm
  },
  summaryKicker: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  summaryValue: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 48,
    lineHeight: 54
  },
  tribeBlock: {
    gap: theme.spacing.md
  },
  tribeHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  tribeTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34
  },
  tribeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle
  },
  creatorName: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 22,
    lineHeight: 28
  },
  creatorMeta: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  tutorialModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 2, 10, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md
  },
  tutorialModalCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.accentBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
    maxHeight: "86%"
  },
  tutorialModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  tutorialKicker: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  tutorialSkipText: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  tutorialSlide: {
    gap: theme.spacing.md,
    paddingRight: theme.spacing.lg
  },
  tutorialTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 42,
    lineHeight: 46
  },
  tutorialPoints: {
    gap: 8
  },
  tutorialPoint: {
    color: theme.colors.textPrimary
  },
  tutorialFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  tutorialProgress: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  tutorialProgressWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  }
};
