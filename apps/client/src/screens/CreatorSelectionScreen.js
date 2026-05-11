import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
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

export default function CreatorSelectionScreen({ navigation }) {
  const {
    addToTribe,
    advanceTutorial,
    creators,
    currentTutorialStep,
    distributionMode,
    getPreference,
    removeFromTribe,
    skipTutorial,
    tutorialActive,
    updatePreference
  } = useAppContext();
  const [query, setQuery] = useState("");

  const visibleCreators = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return creators.filter((creator) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        creator.name.toLowerCase().includes(normalizedQuery) ||
        creator.platform?.toLowerCase().includes(normalizedQuery) ||
        creator.niche?.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [creators, query]);

  async function adjustWeight(creatorId, delta) {
    const currentWeight = getPreference(creatorId)?.weight || 50;
    const nextWeight = Math.max(10, Math.min(100, currentWeight + delta));
    await updatePreference(creatorId, { selected: true, weight: nextWeight });
  }

  async function handleTutorialNext() {
    const nextStep = await advanceTutorial();

    if (nextStep?.screen) {
      navigation.navigate(nextStep.screen);
    }
  }

  return (
    <AppShell
      navigation={navigation}
      activeRoute="CreatorSelection"
    >
      <SectionHeader
        eyebrow="Weighted routing"
        title="Build your creator mix"
        body={
          distributionMode === "even"
            ? "Search your network and add creators to your tribe. Support is currently split equally among your selected creators."
            : "Search your network, add creators to your tribe, and choose how much support each one receives."
        }
      />

      {tutorialActive && currentTutorialStep?.screen === "CreatorSelection" ? (
        <TutorialCallout
          step={currentTutorialStep}
          stepIndex={TUTORIAL_STEPS.findIndex((step) => step.id === currentTutorialStep.id)}
          stepCount={TUTORIAL_STEPS.length}
          onNext={handleTutorialNext}
          onSkip={skipTutorial}
        />
      ) : null}

      <Card>
        <InputField
          label="Search creators"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Search creators"
          value={query}
          onChangeText={setQuery}
        />
      </Card>

      <View style={styles.grid}>
        {visibleCreators.map((creator) => {
          const preference = getPreference(creator.id);
          const isSelected = Boolean(preference?.selected);

          return (
            <Card key={creator.id} style={styles.creatorCard}>
              <View style={{ gap: 6 }}>
                <Text style={styles.creatorName}>{creator.name}</Text>
                <Text style={styles.creatorMeta}>
                  {creator.platform} · {creator.niche}
                </Text>
                <BodyText>{creator.bio}</BodyText>
              </View>

              {isSelected ? (
                <>
                  {distributionMode === "weighted" ? (
                    <View style={styles.weightBlock}>
                      <View style={styles.weightHeader}>
                        <Text style={styles.weightLabel}>Weight</Text>
                        <Text style={styles.weightValue}>{preference.weight}%</Text>
                      </View>
                      <View style={styles.weightTrack}>
                        <View
                          style={[
                            styles.weightFill,
                            { width: `${Math.min(preference.weight, 100)}%` }
                          ]}
                        />
                      </View>
                      <View style={styles.weightActions}>
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
                  ) : null}
                  <SecondaryButton
                    label="Remove from tribe"
                    onPress={() => removeFromTribe(creator.id)}
                  />
                </>
              ) : (
                <PrimaryButton label="Add to tribe" onPress={() => addToTribe(creator.id)} />
              )}
            </Card>
          );
        })}
      </View>

      <SecondaryButton label="Back to routing" onPress={() => navigation.navigate("Home")} />
    </AppShell>
  );
}

const styles = {
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
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "700"
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
  },
  weightActions: {
    flexDirection: "row",
    gap: theme.spacing.sm
  }
};
