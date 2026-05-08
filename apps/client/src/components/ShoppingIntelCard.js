import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BodyText, Card, Kicker, PrimaryButton, SecondaryButton } from "./ui";
import { theme } from "../theme";

const STATUS_STYLES = {
  good: {
    dot: "#8cca6b",
    glow: "rgba(140, 202, 107, 0.18)"
  },
  average: {
    dot: "#f0c36c",
    glow: "rgba(240, 195, 108, 0.18)"
  },
  high: {
    dot: "#d98d84",
    glow: "rgba(217, 141, 132, 0.18)"
  },
  unknown: {
    dot: theme.colors.textMuted,
    glow: "rgba(163, 138, 148, 0.16)"
  },
  clear: {
    dot: "#8cca6b",
    glow: "rgba(140, 202, 107, 0.18)"
  },
  warning: {
    dot: "#f0c36c",
    glow: "rgba(240, 195, 108, 0.18)"
  },
  known: {
    dot: "#8cca6b",
    glow: "rgba(140, 202, 107, 0.18)"
  },
  risk: {
    dot: "#d98d84",
    glow: "rgba(217, 141, 132, 0.18)"
  }
};

function SignalRow({ label, detail, status }) {
  const colors = STATUS_STYLES[status] || STATUS_STYLES.unknown;

  return (
    <View style={styles.signalRow}>
      <View style={[styles.statusDotWrap, { backgroundColor: colors.glow }]}>
        <View style={[styles.statusDot, { backgroundColor: colors.dot }]} />
      </View>
      <View style={styles.signalCopy}>
        <Text style={styles.signalLabel}>{label}</Text>
        <BodyText numberOfLines={2} style={styles.signalDetail}>
          {detail}
        </BodyText>
      </View>
    </View>
  );
}

export default function ShoppingIntelCard({
  analysis,
  fallbackMessage,
  onPrimaryPress,
  onSecondaryPress,
  primaryLabel = "Shop with creator support",
  secondaryLabel = "Clear link",
  secondaryTone = "button",
  disabled = false
}) {
  const signalRows = analysis
    ? [
        analysis.priceSignal,
        analysis.urgencySignal,
        analysis.brandSignal
      ]
    : [];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Kicker>Shopping check</Kicker>
        <Text style={styles.title}>Before you buy</Text>
        {analysis?.productTitle ? (
          <BodyText numberOfLines={2} style={styles.subtitle}>
            {analysis.productTitle}
          </BodyText>
        ) : null}
        {!analysis && fallbackMessage ? <BodyText>{fallbackMessage}</BodyText> : null}
      </View>

      {signalRows.length ? (
        <View style={styles.signalList}>
          {signalRows.map((signal) => (
            <SignalRow
              key={`${signal.status}-${signal.label}`}
              detail={signal.detail}
              label={signal.label}
              status={signal.status}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <PrimaryButton disabled={disabled} label={primaryLabel} onPress={onPrimaryPress} />
        {secondaryTone === "text" ? (
          <Pressable disabled={disabled} onPress={onSecondaryPress}>
            <Text style={styles.secondaryText}>{secondaryLabel}</Text>
          </Pressable>
        ) : (
          <SecondaryButton compact label={secondaryLabel} onPress={onSecondaryPress} />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: theme.colors.accentBorder,
    borderWidth: 1,
    gap: theme.spacing.md
  },
  header: {
    gap: theme.spacing.xs
  },
  secondaryText: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  signalCopy: {
    flex: 1,
    gap: 2
  },
  signalDetail: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  },
  signalLabel: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20
  },
  signalList: {
    gap: theme.spacing.sm
  },
  signalRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle
  },
  statusDot: {
    borderRadius: 999,
    height: 8,
    width: 8
  },
  statusDotWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 26,
    justifyContent: "center",
    width: 26
  },
  subtitle: {
    color: theme.colors.textSecondary
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 32
  }
});
