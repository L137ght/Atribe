import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, Text, useWindowDimensions, View } from "react-native";
import { WebView } from "react-native-webview";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  InputField,
  PrimaryButton,
  SecondaryButton
} from "../components";
import { theme } from "../theme";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getProgramCountryGroups(programs, audienceCountryRows) {
  const audienceCountries = new Set(
    (audienceCountryRows || []).map((row) => normalizeText(row.country))
  );
  const recommended = (programs || []).filter((program) =>
    audienceCountries.has(normalizeText(program.country))
  );
  const remaining = (programs || []).filter(
    (program) => !audienceCountries.has(normalizeText(program.country))
  );

  return { recommended, remaining };
}

export default function BrandProgramWebViewScreen({ navigation, route }) {
  const {
    addAffiliateLink,
    createCreatorBrandLink,
    creatorBrandLinks,
    currentCreator,
    removeAffiliateLink
  } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadHint, setLoadHint] = useState("");
  const [showEmbeddedProgram, setShowEmbeddedProgram] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [linkInput, setLinkInput] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(true);
  const { height, width } = useWindowDimensions();
  const webviewRef = useRef(null);
  const baseBrandName = route?.params?.baseBrandName || route?.params?.brandName || "Brand program";
  const brandName = route?.params?.brandName || "Brand program";
  const applyUrl = route?.params?.applyUrl || "";
  const summary = route?.params?.summary || "";
  const domain = route?.params?.domain || "";
  const platformType = route?.params?.platformType || "";
  const commission = route?.params?.commission || "";
  const fit = route?.params?.fit || "";
  const highlight = route?.params?.highlight || "";
  const commissionDetails = route?.params?.commissionDetails || [];
  const joinSteps = route?.params?.joinSteps || [];
  const commissionFootnote = route?.params?.commissionFootnote || "";
  const countryPrograms = route?.params?.countryPrograms || [];
  const audienceCountryRows = route?.params?.audienceCountryRows || [];

  const canLoad = useMemo(() => /^https?:\/\//i.test(applyUrl), [applyUrl]);
  const isAmazonProgram = useMemo(
    () => /(^|\.)amazon\.[a-z.]+$/i.test(domain || "") || /amazon/i.test(applyUrl),
    [applyUrl, domain]
  );
  const displaySummary = useMemo(() => {
    if (summary) {
      return summary;
    }

    return [platformType, commission].filter(Boolean).join(" · ");
  }, [commission, platformType, summary]);
  const { recommended, remaining } = useMemo(
    () => getProgramCountryGroups(countryPrograms, audienceCountryRows),
    [audienceCountryRows, countryPrograms]
  );
  const relevantDomains = useMemo(() => {
    if (countryPrograms.length) {
      return countryPrograms.map((program) => normalizeText(program.domain)).filter(Boolean);
    }

    return domain ? [normalizeText(domain)] : [];
  }, [countryPrograms, domain]);
  const relevantLinks = useMemo(
    () =>
      (currentCreator?.links || []).filter((link) =>
        relevantDomains.includes(normalizeText(link.domain))
      ),
    [currentCreator?.links, relevantDomains]
  );
  const isShopifyConnection = useMemo(
    () => /\.myshopify\.com$/i.test(domain || ""),
    [domain]
  );
  const relevantBrandLinks = useMemo(
    () =>
      (creatorBrandLinks || []).filter(
        (link) => normalizeText(link.shopDomain) === normalizeText(domain) && link.status !== "archived"
      ),
    [creatorBrandLinks, domain]
  );
  const frameWidth = Math.max(
    280,
    Math.min(width, theme.layout.maxWidth) - theme.spacing.xl * 2
  );
  const frameHeight = Math.max(560, Math.round(frameWidth * (height / width)));
  const shouldUseNaturalMobileViewport = width <= 720 || frameWidth <= 520;
  const embeddedViewportWidth = shouldUseNaturalMobileViewport ? frameWidth : 1024;
  const embeddedViewportScale = frameWidth / embeddedViewportWidth;
  const embeddedViewportHeight = Math.round(frameHeight / embeddedViewportScale);
  const embeddedViewportOuterStyle = {
    height: frameHeight
  };
  const embeddedViewportInnerStyle = {
    width: embeddedViewportWidth,
    height: embeddedViewportHeight,
    transform: `scale(${embeddedViewportScale})`,
    transformOrigin: "top left"
  };
  const webviewViewportStyle = {
    height: frameHeight
  };

  useEffect(() => {
    setIsLoading(false);
    setLoadError("");
    setLoadHint("");
    setShowEmbeddedProgram(false);
    setCanGoBack(false);
    setCanGoForward(false);
    setReloadKey(0);
    setLinkInput("");
    setCouponInput("");
    setShowLinkForm(relevantLinks.length === 0);
  }, [applyUrl, relevantLinks.length]);

  useEffect(() => {
    if (!canLoad || !isLoading || !showEmbeddedProgram) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      if (isAmazonProgram) {
        setLoadError(
          "Amazon is not completing inside the embedded frame. Open it directly to continue signup."
        );
      } else {
        setLoadHint(
          "This page is still loading. If it stays blank, give it a moment or reopen the brand page."
        );
      }
      setIsLoading(false);
    }, isAmazonProgram ? 8000 : 15000);

    return () => clearTimeout(timeoutId);
  }, [canLoad, isAmazonProgram, isLoading, showEmbeddedProgram]);

  async function handleOpenDirectly() {
    if (!canLoad) {
      return;
    }

    await Linking.openURL(applyUrl);
  }

  function handleOpenCountryProgram(program) {
    if (!program?.applyUrl) {
      return;
    }

    navigation.replace("BrandProgramWebView", {
      ...route?.params,
      brandName: `${baseBrandName} ${program.country}`,
      applyUrl: program.applyUrl,
      domain: program.domain || domain,
      summary: `${program.country} · ${program.domain || domain} · ${commission}`
    });
  }

  async function handleSaveLink() {
    try {
      if (isShopifyConnection) {
        await createCreatorBrandLink(domain);
        setShowLinkForm(false);
        Alert.alert(
          "Shopify store connected",
          "This Shopify store is now linked through the backend creator-brand association flow."
        );
        return;
      }

      if (!linkInput.trim()) {
        throw new Error("Add your affiliate URL before saving.");
      }

      await addAffiliateLink(linkInput);
      setLinkInput("");
      setCouponInput("");
      setShowLinkForm(false);
      Alert.alert(
        "Brand connected",
        couponInput.trim()
          ? "The affiliate URL is saved. Your coupon code can be added in a later creator tools pass."
          : "The affiliate URL has been added to your creator workspace."
      );
    } catch (error) {
      Alert.alert("Affiliate links", error.message);
    }
  }

  function handleOpenInAppBrowser() {
    if (!canLoad || typeof window === "undefined") {
      return;
    }

    const nextWindow = window.open(applyUrl, "_blank", "noopener,noreferrer");

    if (!nextWindow) {
      setLoadHint("Your browser blocked opening a new in-app tab. Allow popups and try again.");
    }
  }

  function handleReloadEmbeddedProgram() {
    setLoadError("");
    setLoadHint("");
    setIsLoading(true);

    if (Platform.OS === "web") {
      setReloadKey((current) => current + 1);
      return;
    }

    webviewRef.current?.reload?.();
  }

  function handleEmbeddedBack() {
    if (Platform.OS === "web") {
      return;
    }

    webviewRef.current?.goBack?.();
  }

  function handleEmbeddedForward() {
    if (Platform.OS === "web") {
      return;
    }

    webviewRef.current?.goForward?.();
  }

  return (
    <AppShell
      navigation={navigation}
      activeRoute="CreatorDashboard"
      title={brandName}
    >
      <Card style={styles.detailsCard}>
        {displaySummary ? <Text style={styles.summaryText}>{displaySummary}</Text> : null}
        <View style={styles.metricRow}>
          {commission ? (
            <View style={styles.metricPill}>
              <Text style={styles.metricPillText}>{commission}</Text>
            </View>
          ) : null}
          {domain ? (
            <View style={styles.metricPill}>
              <Text style={styles.metricPillText}>{domain}</Text>
            </View>
          ) : null}
        </View>
        {fit ? <BodyText>Best for: {fit}</BodyText> : null}
        {highlight ? <BodyText>{highlight}</BodyText> : null}
        {commissionDetails.length ? (
          <View style={styles.infoStack}>
            <Text style={styles.sectionLabel}>Commission snapshot</Text>
            {commissionDetails.map((item) => (
              <BodyText key={item}>{item}</BodyText>
            ))}
          </View>
        ) : null}
        {joinSteps.length ? (
          <View style={styles.infoStack}>
            <Text style={styles.sectionLabel}>How it works</Text>
            <View style={styles.exampleGrid}>
              {joinSteps.map((step, index) => (
                <View key={`${index + 1}-${step.title}`} style={styles.exampleCard}>
                  <Text style={styles.exampleLabel}>{index + 1}. {step.title}</Text>
                  <BodyText>{step.detail}</BodyText>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        {commissionFootnote ? <BodyText>{commissionFootnote}</BodyText> : null}
        <View style={styles.infoStack}>
          <Text style={styles.sectionLabel}>
            {isShopifyConnection ? "Shopify brand connection" : "Affiliate links"}
          </Text>
          {isShopifyConnection ? (
            <BodyText>
              Shopify store associations are written through the backend. External affiliate URLs still save directly to your creator affiliate-link data.
            </BodyText>
          ) : null}
          {showLinkForm ? (
            <View style={styles.formGrid}>
              {!isShopifyConnection ? (
                <>
                  <InputField
                    label="Affiliate URL"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    placeholder={`https://${domain || "brand.com"}/?...`}
                    value={linkInput}
                    onChangeText={setLinkInput}
                    style={{ flex: 1, minWidth: 240 }}
                  />
                  <InputField
                    label="Coupon code"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="Optional"
                    value={couponInput}
                    onChangeText={setCouponInput}
                    style={{ flex: 1, minWidth: 180 }}
                  />
                </>
              ) : null}
              <View style={styles.actionStack}>
                <PrimaryButton
                  label={isShopifyConnection ? "Connect Shopify store" : "Save connection"}
                  onPress={handleSaveLink}
                />
                {relevantLinks.length || relevantBrandLinks.length ? (
                  <SecondaryButton label="Cancel" onPress={() => setShowLinkForm(false)} />
                ) : null}
              </View>
            </View>
          ) : (
            <SecondaryButton
              label={
                isShopifyConnection
                  ? relevantBrandLinks.length
                    ? "Manage Shopify connection"
                    : "Connect Shopify store"
                  : relevantLinks.length
                    ? "Add link"
                    : "Add affiliate link"
              }
              onPress={() => setShowLinkForm(true)}
            />
          )}

          {relevantLinks.length || relevantBrandLinks.length ? (
            <View style={styles.linkList}>
              {relevantLinks.map((link) => (
                <View key={link.id} style={styles.linkRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.linkDomain}>{link.domain}</Text>
                    <BodyText numberOfLines={2}>{link.url}</BodyText>
                  </View>
                  <SecondaryButton
                    compact
                    label="Remove"
                    onPress={() => removeAffiliateLink(link.id)}
                  />
                </View>
              ))}
              {relevantBrandLinks.map((link) => (
                <View key={link.id} style={styles.linkRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.linkDomain}>{link.shopDomain}</Text>
                    <BodyText numberOfLines={2}>
                      Shopify backend connection · status {link.status}
                    </BodyText>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <BodyText>
              {isShopifyConnection
                ? "Connect this Shopify store here once the brand confirms the relationship."
                : "Save your affiliate link here once the program approves you."}
            </BodyText>
          )}
        </View>
        {countryPrograms.length ? (
          <View style={styles.infoStack}>
            <Text style={styles.sectionLabel}>Choose your storefront</Text>
            <BodyText>
              Amazon Associates accounts are country-specific. Start with the storefront your
              audience shops from most.
            </BodyText>
            {recommended.length ? (
              <View style={styles.infoStack}>
                <Text style={styles.sectionLabel}>Audience matches</Text>
                <View style={styles.countryGrid}>
                  {recommended.map((program) => (
                    <SecondaryButton
                      key={program.country}
                      compact
                      label={`${program.country} · ${program.domain}`}
                      selected
                      onPress={() => handleOpenCountryProgram(program)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            <View style={styles.infoStack}>
              <Text style={styles.sectionLabel}>
                {recommended.length ? "More storefronts" : "Available storefronts"}
              </Text>
              <View style={styles.countryGrid}>
                {remaining.map((program) => (
                  <SecondaryButton
                    key={program.country}
                    compact
                    label={`${program.country} · ${program.domain}`}
                    onPress={() => handleOpenCountryProgram(program)}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : null}
        {!showEmbeddedProgram ? (
          <View style={styles.actionStack}>
            <PrimaryButton
              label="Join program"
              onPress={() => {
                setLoadError("");
                setLoadHint("");
                setIsLoading(true);
                setShowEmbeddedProgram(true);
              }}
            />
            <SecondaryButton label="Back to brands" onPress={() => navigation.goBack()} />
          </View>
        ) : null}
      </Card>

      {canLoad && showEmbeddedProgram ? (
        <Card style={styles.webviewCard}>
          <View style={styles.browserToolbar}>
            <SecondaryButton compact label="Return to app" onPress={() => navigation.goBack()} />
            {Platform.OS === "web" ? (
              <>
                <SecondaryButton compact label="Open in app browser" onPress={handleOpenInAppBrowser} />
                <SecondaryButton compact label="Reload" onPress={handleReloadEmbeddedProgram} />
              </>
            ) : (
              <>
                <SecondaryButton
                  compact
                  label="Back"
                  selected={canGoBack}
                  onPress={handleEmbeddedBack}
                />
                <SecondaryButton
                  compact
                  label="Forward"
                  selected={canGoForward}
                  onPress={handleEmbeddedForward}
                />
                <SecondaryButton compact label="Reload" onPress={handleReloadEmbeddedProgram} />
              </>
            )}
          </View>
          {isLoading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.colors.accentSoft} />
              <BodyText>Loading affiliate program...</BodyText>
            </View>
          ) : null}
          {loadError ? (
            <View style={styles.loadingOverlay}>
              <Text style={styles.errorTitle}>Open this program directly</Text>
              <BodyText>{loadError}</BodyText>
              <View style={styles.actionStack}>
                {Platform.OS === "web" ? (
                  <PrimaryButton label="Open in app browser" onPress={handleOpenInAppBrowser} />
                ) : null}
                <PrimaryButton label="Open in browser" onPress={handleOpenDirectly} />
                <SecondaryButton label="Back to brands" onPress={() => navigation.goBack()} />
              </View>
            </View>
          ) : null}

          <View style={styles.webviewFrame}>
            {Platform.OS === "web" ? (
              <View style={[styles.webViewportShell, embeddedViewportOuterStyle]}>
                <iframe
                  key={`${applyUrl}:${reloadKey}`}
                  src={applyUrl}
                  title={`${brandName} affiliate program`}
                  onLoad={() => {
                    setLoadError("");
                    setLoadHint("");
                    setIsLoading(false);
                  }}
                  style={
                    shouldUseNaturalMobileViewport
                      ? { ...styles.webFrame, ...webviewViewportStyle }
                      : { ...styles.webFrame, ...embeddedViewportInnerStyle }
                  }
                />
              </View>
            ) : (
              <View style={[styles.nativeWebviewShell, webviewViewportStyle]}>
                <WebView
                  key={`${applyUrl}:${reloadKey}`}
                  ref={webviewRef}
                  source={{ uri: applyUrl }}
                  injectedJavaScript={
                    shouldUseNaturalMobileViewport
                      ? `
                          const viewport = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
                          viewport.name = 'viewport';
                          viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1';
                          if (!viewport.parentNode) document.head.appendChild(viewport);
                          true;
                        `
                      : undefined
                  }
                  onLoadEnd={() => {
                    setLoadError("");
                    setLoadHint("");
                    setIsLoading(false);
                  }}
                  onNavigationStateChange={(nextState) => {
                    setCanGoBack(Boolean(nextState.canGoBack));
                    setCanGoForward(Boolean(nextState.canGoForward));
                  }}
                  onError={() => {
                    setLoadError("This affiliate page could not be loaded inside the embedded frame.");
                    setIsLoading(false);
                  }}
                  scalesPageToFit={false}
                  startInLoadingState
                  sharedCookiesEnabled
                  style={styles.webview}
                  userAgent={
                    shouldUseNaturalMobileViewport
                      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                      : undefined
                  }
                  />
              </View>
            )}
          </View>
        </Card>
      ) : !canLoad ? (
        <Card>
          <Text style={styles.errorTitle}>Unable to load this brand program</Text>
          <BodyText>
            The selected affiliate program URL is missing or invalid. Return to the brand list and
            try another program.
          </BodyText>
          <SecondaryButton label="Back to brands" onPress={() => navigation.goBack()} />
        </Card>
      ) : null}

      {loadHint ? (
        <Card style={styles.hintCard}>
          <BodyText>{loadHint}</BodyText>
          <View style={styles.actionStack}>
            {Platform.OS === "web" ? (
              <PrimaryButton label="Open in app browser" onPress={handleOpenInAppBrowser} />
            ) : null}
            <SecondaryButton label="Open in browser" onPress={handleOpenDirectly} />
          </View>
        </Card>
      ) : null}
    </AppShell>
  );
}

const styles = {
  detailsCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.accentBorder
  },
  summaryText: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  metricPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    backgroundColor: "rgba(143,1,100,0.12)"
  },
  metricPillText: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  infoStack: {
    gap: theme.spacing.sm
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase"
  },
  exampleGrid: {
    gap: theme.spacing.sm
  },
  formGrid: {
    gap: theme.spacing.md
  },
  countryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  linkList: {
    gap: theme.spacing.sm
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: "rgba(255,255,255,0.02)"
  },
  linkDomain: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  exampleCard: {
    gap: 6,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: "rgba(255,255,255,0.02)"
  },
  exampleLabel: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: "700"
  },
  examplePayout: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  actionStack: {
    width: "100%",
    gap: theme.spacing.sm
  },
  webviewCard: {
    padding: 0,
    overflow: "hidden"
  },
  browserToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    backgroundColor: "rgba(18,10,14,0.88)"
  },
  hintCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderColor: theme.colors.borderSubtle
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: "rgba(29,17,22,0.92)",
    padding: theme.spacing.lg,
    zIndex: 1
  },
  webviewFrame: {
    width: "100%",
    backgroundColor: theme.colors.bgSecondary
  },
  webViewportShell: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: theme.colors.surface
  },
  nativeWebviewShell: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: theme.colors.surface
  },
  webview: {
    flex: 1,
    backgroundColor: theme.colors.surface
  },
  webFrame: {
    width: "100%",
    borderWidth: 0,
    borderStyle: "none",
    backgroundColor: theme.colors.surface
  },
  errorTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34
  }
};
