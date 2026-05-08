import React from "react";
import { Share, Text, View } from "react-native";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  PrimaryButton,
  SecondaryButton,
  SectionHeader
} from "../components";
import { theme } from "../theme";

export default function CampaignSuccessScreen({ navigation, route }) {
  const { brandShopDomain } = useAppContext();
  const shopDomain = route?.params?.shopDomain || brandShopDomain || "";
  const commissionRatePercent = route?.params?.commissionRatePercent || "";

  async function handleInviteCreators() {
    await Share.share({
      message: `Atribe creator campaign is live for ${shopDomain}. Creator payout pool: ${commissionRatePercent}% per sale.`
    });
  }

  return (
    <AppShell activeRoute="BrandHome" navigation={navigation}>
      <SectionHeader
        eyebrow="Campaign live"
        title="Your campaign is live"
        body="Creators can now discover your offer and start driving tracked sales."
      />

      <View style={styles.grid}>
        <Card style={styles.primaryCard}>
          <View style={styles.copyStack}>
            <BodyText>• Creators can now discover your offer</BodyText>
            <BodyText>• Orders will be tracked automatically</BodyText>
            <BodyText>• Commission will be split through Atribe</BodyText>
          </View>

          <Card style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Live campaign</Text>
            <BodyText>{shopDomain}</BodyText>
            <BodyText>{commissionRatePercent}% creator payout pool</BodyText>
          </Card>

          <View style={styles.actionsRow}>
            <PrimaryButton label="View brand home" onPress={() => navigation.replace("BrandHome")} />
            <SecondaryButton label="Invite creators" onPress={handleInviteCreators} />
          </View>
        </Card>
      </View>
    </AppShell>
  );
}

const styles = {
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.lg
  },
  primaryCard: {
    flex: 1,
    minWidth: 320,
    gap: theme.spacing.lg
  },
  copyStack: {
    gap: theme.spacing.sm
  },
  noticeCard: {
    gap: theme.spacing.sm
  },
  noticeTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  }
};
