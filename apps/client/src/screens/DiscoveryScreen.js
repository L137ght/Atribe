import React, { useMemo, useState } from "react";
import { Linking, Text, View } from "react-native";
import { useAppContext } from "../context";
import { BRAND_PLATFORM_TYPES, brandPrograms } from "../data";
import {
  AppShell,
  BodyText,
  Card,
  CreatorAvatar,
  InputField,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  TutorialCallout
} from "../components";
import { theme } from "../theme";
import { TUTORIAL_STEPS } from "../utils";

const CREATOR_FILTERS = ["All", "Editorial", "Lifestyle", "Architecture", "Sustainability", "Tech"];
const DISCOVERY_MODES = [
  { key: "creators", label: "Creators" },
  { key: "brands", label: "Brands" }
];

export default function DiscoveryScreen({ navigation }) {
  const {
    addToTribe,
    advanceTutorial,
    creators,
    currentTutorialStep,
    getPreference,
    intent,
    removeFromTribe,
    skipTutorial,
    tutorialActive
  } = useAppContext();
  const [discoveryMode, setDiscoveryMode] = useState("creators");
  const [query, setQuery] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("All");
  const [brandFilter, setBrandFilter] = useState("All");

  const visibleCreators = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return creators.filter((creator) => {
      const matchesFilter =
        creatorFilter === "All" ||
        creator.niche?.toLowerCase().includes(creatorFilter.toLowerCase()) ||
        creator.platform?.toLowerCase().includes(creatorFilter.toLowerCase());

      const matchesQuery =
        !normalizedQuery ||
        creator.name.toLowerCase().includes(normalizedQuery) ||
        creator.platform?.toLowerCase().includes(normalizedQuery) ||
        creator.niche?.toLowerCase().includes(normalizedQuery) ||
        creator.links?.some((link) => link.domain.includes(normalizedQuery));

      return matchesFilter && matchesQuery;
    });
  }, [creatorFilter, creators, query]);

  const visibleBrands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return brandPrograms.filter((brand) => {
      const matchesFilter =
        brandFilter === "All" ||
        brand.platformType?.toLowerCase().includes(brandFilter.toLowerCase());

      const matchesQuery =
        !normalizedQuery ||
        brand.name.toLowerCase().includes(normalizedQuery) ||
        brand.domain.toLowerCase().includes(normalizedQuery) ||
        brand.platformType?.toLowerCase().includes(normalizedQuery) ||
        brand.fit?.toLowerCase().includes(normalizedQuery) ||
        brand.highlight?.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [brandFilter, query]);

  const activeFilters = discoveryMode === "creators" ? CREATOR_FILTERS : BRAND_PLATFORM_TYPES;
  const activeFilter = discoveryMode === "creators" ? creatorFilter : brandFilter;
  const results = discoveryMode === "creators" ? visibleCreators : visibleBrands;

  async function handleTutorialNext() {
    const nextStep = await advanceTutorial();

    if (nextStep?.screen) {
      navigation.navigate(nextStep.screen);
    }
  }

  function handleModeChange(nextMode) {
    setDiscoveryMode(nextMode);
    setQuery("");
  }

  function handleFilterChange(nextFilter) {
    if (discoveryMode === "creators") {
      setCreatorFilter(nextFilter);
      return;
    }

    setBrandFilter(nextFilter);
  }

  async function handleOpenBrandProgram(url) {
    if (!url) {
      return;
    }

    await Linking.openURL(url);
  }

  return (
    <AppShell
      navigation={navigation}
      activeRoute="CreatorDiscovery"
    >
      <SectionHeader title="Discovery" />

      {tutorialActive && currentTutorialStep?.screen === "CreatorDiscovery" ? (
        <TutorialCallout
          step={currentTutorialStep}
          stepIndex={TUTORIAL_STEPS.findIndex((step) => step.id === currentTutorialStep.id)}
          stepCount={TUTORIAL_STEPS.length}
          onNext={handleTutorialNext}
          onSkip={skipTutorial}
        />
      ) : null}

      <Card>
        <View style={styles.modeToggleRow}>
          {DISCOVERY_MODES.map((mode) => (
            <SecondaryButton
              key={mode.key}
              compact
              label={mode.label}
              selected={discoveryMode === mode.key}
              onPress={() => handleModeChange(mode.key)}
            />
          ))}
        </View>

        <InputField
          label="Search"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={
            discoveryMode === "creators"
              ? "Search by name, niche, platform, or domain..."
              : "Search by brand, domain, category, or fit..."
          }
          value={query}
          onChangeText={setQuery}
        />

        <View style={styles.filterRow}>
          {activeFilters.map((item) => {
            const isActive = item === activeFilter;
            return (
              <SecondaryButton
                key={item}
                label={item}
                compact
                selected={isActive}
                onPress={() => handleFilterChange(item)}
              />
            );
          })}
        </View>
      </Card>

      <View style={styles.grid}>
        {discoveryMode === "creators"
          ? visibleCreators.map((creator) => {
              const inTribe = Boolean(getPreference(creator.id)?.selected);

              return (
                <Card key={creator.id} style={styles.creatorCard}>
                  <View style={{ flexDirection: "row", gap: theme.spacing.sm, alignItems: "center", marginBottom: 8 }}>
                    <CreatorAvatar creator={creator} size={48} />
                    <View style={{ gap: 4 }}>
                      <Text style={styles.creatorName}>{creator.name}</Text>
                      <Text style={styles.creatorMeta}>
                        {creator.platform} · {creator.niche}
                      </Text>
                    </View>
                  </View>
                  <BodyText>{creator.bio}</BodyText>

                  <View style={styles.supportedDomains}>
                    {creator.links?.map((link) => (
                      <View key={link.id} style={styles.domainPill}>
                        <Text style={styles.domainPillText}>{link.domain}</Text>
                      </View>
                    ))}
                  </View>

                  {inTribe ? (
                    <SecondaryButton
                      label="In tribe"
                      onPress={() => removeFromTribe(creator.id)}
                    />
                  ) : (
                    <PrimaryButton
                      label="Add to tribe"
                      onPress={() => addToTribe(creator.id)}
                    />
                  )}
                </Card>
              );
            })
          : visibleBrands.map((brand) => (
              <Card key={brand.id} style={styles.creatorCard}>
                <View style={{ gap: 8 }}>
                  <Text style={styles.creatorName}>{brand.name}</Text>
                  <Text style={styles.creatorMeta}>
                    {brand.platformType} · {brand.domain}
                  </Text>
                  <BodyText>{brand.highlight}</BodyText>
                  <BodyText>Best for: {brand.fit}</BodyText>
                </View>

                <View style={styles.supportedDomains}>
                  <View style={styles.domainPill}>
                    <Text style={styles.domainPillText}>{brand.commission}</Text>
                  </View>
                  {brand.countryPrograms?.length ? (
                    <View style={styles.domainPill}>
                      <Text style={styles.domainPillText}>
                        {brand.countryPrograms.length} markets
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.brandActionRow}>
                  <SecondaryButton
                    label="Open program"
                    onPress={() => handleOpenBrandProgram(brand.applyUrl)}
                  />
                  {intent === "creator" ? (
                    <PrimaryButton
                      label="Connect brands"
                      onPress={() => navigation.navigate("ConnectBrands")}
                    />
                  ) : null}
                </View>
              </Card>
            ))}
      </View>

      {!results.length ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            No {discoveryMode === "creators" ? "creators" : "brands"} match this search
          </Text>
          <BodyText>
            Try a different search or switch the filter to widen the results.
          </BodyText>
        </Card>
      ) : null}

      {discoveryMode === "creators" ? (
        <SecondaryButton
          label="Refine creator weights"
          onPress={() => navigation.navigate("CreatorSelection")}
        />
      ) : null}
    </AppShell>
  );
}

const styles = {
  modeToggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
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
  creatorCard: {
    width: 340,
    flexGrow: 1
  },
  creatorName: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34
  },
  creatorMeta: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  supportedDomains: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  brandActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  domainPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceElevated
  },
  domainPillText: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  emptyCard: {
    width: "100%"
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    lineHeight: 30
  }
};
