import React, { useMemo, useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import { useAppContext } from "../context";
import { BRAND_PLATFORM_TYPES, brandPrograms } from "../data";
import {
  AppShell,
  BodyText,
  Card,
  InputField,
  PrimaryButton,
  SecondaryButton,
  SectionHeader
} from "../components";
import { theme } from "../theme";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function categoriesMatch(left, right) {
  return normalizeText(left) === normalizeText(right);
}

function domainsMatch(left, right) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.endsWith(`.${normalizedRight}`) ||
    normalizedRight.endsWith(`.${normalizedLeft}`)
  );
}

function getLatestSnapshot(account) {
  return account?.creator_social_audience_snapshots?.[0] || null;
}

function getAudienceCountryRows(accounts) {
  const totals = new Map();

  for (const account of accounts || []) {
    const locations = getLatestSnapshot(account)?.location_breakdown || {};

    Object.entries(locations).forEach(([country, value]) => {
      if (normalizeText(country) === "other") {
        return;
      }

      totals.set(country, (totals.get(country) || 0) + (Number(value) || 0));
    });
  }

  return Array.from(totals.entries())
    .map(([country, value]) => ({ country, value }))
    .sort((left, right) => right.value - left.value);
}

function getProgramCountryGroups(brand, audienceCountryRows) {
  const programs = brand.countryPrograms || [];
  const audienceCountries = new Set(
    audienceCountryRows.map((row) => normalizeText(row.country))
  );
  const recommended = programs.filter((program) =>
    audienceCountries.has(normalizeText(program.country))
  );
  const remaining = programs.filter(
    (program) => !audienceCountries.has(normalizeText(program.country))
  );

  return { recommended, remaining };
}

export default function ConnectBrandsScreen({ navigation }) {
  const { addAffiliateLink, creatorBrandLinks, creatorSocialAccounts, currentCreator } = useAppContext();
  const [query, setQuery] = useState("");
  const [platformType, setPlatformType] = useState("All");
  const [expandedBrandId, setExpandedBrandId] = useState(null);
  const [affiliateInputs, setAffiliateInputs] = useState({});
  const [couponInputs, setCouponInputs] = useState({});
  const [brokenLogos, setBrokenLogos] = useState({});

  const connectedDomains = useMemo(
    () => [
      ...(currentCreator?.links || []).map((link) => normalizeText(link.domain)),
      ...(creatorBrandLinks || [])
        .filter((link) => link.status !== "archived")
        .map((link) => normalizeText(link.shopDomain))
    ],
    [creatorBrandLinks, currentCreator?.links]
  );
  const audienceCountryRows = useMemo(
    () => getAudienceCountryRows(creatorSocialAccounts),
    [creatorSocialAccounts]
  );

  const visibleBrands = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    const normalizedPlatformType = normalizeText(platformType);

    return brandPrograms.filter((brand) => {
      const matchesType =
        normalizedPlatformType === "all" || categoriesMatch(brand.platformType, platformType);
      const matchesQuery =
        !normalizedQuery ||
        normalizeText(brand.name).includes(normalizedQuery) ||
        normalizeText(brand.domain).includes(normalizedQuery) ||
        normalizeText(brand.platformType).includes(normalizedQuery) ||
        normalizeText(brand.fit).includes(normalizedQuery);

      return matchesType && matchesQuery;
    });
  }, [platformType, query]);

  async function handleSaveConnection(brand) {
    try {
      const affiliateUrl = affiliateInputs[brand.id]?.trim();

      if (!affiliateUrl) {
        throw new Error("Add your affiliate URL before saving.");
      }

      await addAffiliateLink(affiliateUrl);

      setExpandedBrandId(null);
      Alert.alert(
        "Brand connected",
        couponInputs[brand.id]?.trim()
          ? "The affiliate URL is saved. Your coupon code can be added to the next creator tools pass."
          : "The affiliate URL has been added to your creator workspace."
      );
    } catch (error) {
      Alert.alert("Connect brands", error.message);
    }
  }

  async function handleJoinProgram(brand, program) {
    const applyUrl = program?.applyUrl || brand.applyUrl;
    const country = program?.country || "";
    const domain = program?.domain || brand.domain;
    const summaryLabel = country
      ? `${country} · ${domain} · ${brand.commission}`
      : `${brand.platformType} · ${brand.commission}`;

    navigation.navigate("BrandProgramWebView", {
      baseBrandName: brand.name,
      brandName: country ? `${brand.name} ${country}` : brand.name,
      applyUrl,
      summary: summaryLabel,
      domain,
      platformType: brand.platformType,
      commission: brand.commission,
      fit: brand.fit,
      highlight: brand.highlight,
      commissionDetails: brand.commissionDetails || [],
      joinSteps: brand.joinSteps || [],
      commissionFootnote: brand.commissionFootnote || "",
      countryPrograms: brand.countryPrograms || [],
      audienceCountryRows
    });
  }

  function setAffiliateValue(brandId, value) {
    setAffiliateInputs((current) => ({
      ...current,
      [brandId]: value
    }));
  }

  function setCouponValue(brandId, value) {
    setCouponInputs((current) => ({
      ...current,
      [brandId]: value
    }));
  }

  function markLogoBroken(brandId) {
    setBrokenLogos((current) => ({
      ...current,
      [brandId]: true
    }));
  }

  return (
    <AppShell
      navigation={navigation}
      activeRoute="CreatorDashboard"
    >
      <SectionHeader
        eyebrow="Partnerships"
        title="Connect brands"
        body="Join brand programs to earn everytime your supporters purchase from that brand"
      />

      <Card style={styles.searchCard}>
        <Text style={styles.searchTitle}>Search brands</Text>
        <InputField
          label="Search brands"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Search by brand, domain, or category..."
          value={query}
          onChangeText={setQuery}
        />

        <View style={styles.filterRow}>
          {BRAND_PLATFORM_TYPES.map((item) => (
            <SecondaryButton
              key={item}
              compact
              label={item}
              selected={platformType === item}
              onPress={() => setPlatformType(item)}
            />
          ))}
        </View>
      </Card>

      <View style={styles.grid}>
        {visibleBrands.map((brand) => {
          const isExpanded = expandedBrandId === brand.id;
          const isConnected = connectedDomains.some((domain) => domainsMatch(domain, brand.domain));

          return (
            <Card
              key={brand.id}
              style={[styles.brandCard, isExpanded && styles.brandCardExpanded]}
            >
              <View style={styles.brandHeader}>
                <View style={styles.brandIdentity}>
                  <View style={styles.logoBlock}>
                    {brand.logoUrl && !brokenLogos[brand.id] ? (
                      <Image
                        source={{ uri: brand.logoUrl }}
                        style={styles.logoImage}
                        resizeMode="contain"
                        onError={() => markLogoBroken(brand.id)}
                      />
                    ) : (
                      <Text style={styles.logoText}>{brand.name.slice(0, 2).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.brandTitle}>{brand.name}</Text>
                    <Text style={styles.brandMeta}>
                      {brand.platformType} · {brand.domain}
                    </Text>
                    <View style={styles.brandInfoRow}>
                      <View style={styles.infoPill}>
                        <Text style={styles.infoPillText}>{brand.commission}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={[styles.statusPill, isConnected && styles.statusPillConnected]}>
                  <Text style={[styles.statusText, isConnected && styles.statusTextConnected]}>
                    {isConnected ? "Connected" : "Available"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailStack}>
                <BodyText>Best for: {brand.fit}</BodyText>
                <BodyText>{brand.highlight}</BodyText>
              </View>

              {isExpanded ? (
                <View style={styles.expandedPanel}>
                  <View style={styles.formGrid}>
                    <InputField
                      label="Affiliate URL"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      placeholder={`https://${brand.domain}/?...`}
                      value={affiliateInputs[brand.id] || ""}
                      onChangeText={(value) => setAffiliateValue(brand.id, value)}
                      style={{ flex: 1, minWidth: 240 }}
                    />
                    <InputField
                      label="Coupon code"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      placeholder="Optional"
                      value={couponInputs[brand.id] || ""}
                      onChangeText={(value) => setCouponValue(brand.id, value)}
                      style={{ flex: 1, minWidth: 180 }}
                    />
                  </View>

                  <View style={styles.actionRow}>
                    <PrimaryButton
                      compact
                      label="Save connection"
                      onPress={() => handleSaveConnection(brand)}
                    />
                    <SecondaryButton
                      compact
                      label="Join program"
                      onPress={() => handleJoinProgram(brand)}
                    />
                    <SecondaryButton
                      compact
                      label="Close"
                      onPress={() => setExpandedBrandId(null)}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <PrimaryButton
                    compact
                    label={isConnected ? "Update link" : "Connect brand"}
                    onPress={() => setExpandedBrandId(brand.id)}
                  />
                  <SecondaryButton
                    compact
                    label="Join program"
                    onPress={() => handleJoinProgram(brand)}
                  />
                </View>
              )}
            </Card>
          );
        })}

        {!visibleBrands.length ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No brands match this filter</Text>
            <BodyText>
              Try a different category or search by domain, brand name, or platform type.
            </BodyText>
          </Card>
        ) : null}
      </View>

      <SecondaryButton
        label="Back to dashboard"
        onPress={() => navigation.navigate("CreatorDashboard")}
      />
    </AppShell>
  );
}

const styles = {
  searchCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.accentBorder
  },
  searchTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 30,
    lineHeight: 36
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  brandCard: {
    width: 340,
    flexGrow: 1,
    minHeight: 250,
    justifyContent: "space-between",
    backgroundColor: theme.colors.surfaceElevated
  },
  brandCardExpanded: {
    width: "100%"
  },
  emptyCard: {
    width: "100%"
  },
  brandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  brandIdentity: {
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.md
  },
  logoBlock: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.bgSecondary,
    overflow: "hidden"
  },
  logoImage: {
    width: "100%",
    height: "100%"
  },
  logoText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2
  },
  brandTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 26,
    lineHeight: 32
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34
  },
  brandMeta: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  brandInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4
  },
  infoPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle
  },
  infoPillText: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle
  },
  statusPillConnected: {
    backgroundColor: "rgba(31,85,0,0.26)",
    borderColor: "rgba(140,202,107,0.18)"
  },
  statusText: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  statusTextConnected: {
    color: theme.colors.successText
  },
  detailStack: {
    gap: 6
  },
  expandedPanel: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  }
};
