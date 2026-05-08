import React from "react";
import { Text, View } from "react-native";
import { BodyText, Card, Kicker, PrimaryButton, SecondaryButton } from "../components";
import { theme } from "../theme";

export default function TutorialCallout({
  step,
  stepIndex,
  stepCount,
  onNext,
  onSkip
}) {
  if (!step) {
    return null;
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Kicker>First Login Guide</Kicker>
          <Text style={styles.title}>{step.title}</Text>
        </View>
        <Text style={styles.progress}>
          {stepIndex + 1}/{stepCount}
        </Text>
      </View>

      <BodyText>{step.body}</BodyText>

      <View style={styles.points}>
        {step.points.map((point) => (
          <BodyText key={point} style={styles.point}>
            • {point}
          </BodyText>
        ))}
      </View>

      <View style={styles.actions}>
        <SecondaryButton compact label="Skip tutorial" onPress={onSkip} />
        <PrimaryButton compact label={step.nextLabel} onPress={onNext} />
      </View>
    </Card>
  );
}

const styles = {
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.accentBorder
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.md
  },
  headerCopy: {
    flex: 1,
    gap: 6
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34
  },
  progress: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  points: {
    gap: 6
  },
  point: {
    color: theme.colors.textPrimary
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  }
};
