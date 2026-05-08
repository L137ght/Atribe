import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  PrimaryButton,
  SectionHeader
} from "../components";
import { theme } from "../theme";

export default function CampaignGateScreen({ navigation }) {
  const { brandHasActiveCampaign, brandShopDomain } = useAppContext();

  useEffect(() => {
    if (brandHasActiveCampaign) {
      navigation.replace("BrandHome");
    }
  }, [brandHasActiveCampaign, navigation]);

  return (
    <AppShell activeRoute="CreateCampaign" navigation={navigation}>
      <SectionHeader
        eyebrow="Campaign required"
        title="Create your first campaign to access growth tools"
        body="Your Shopify connection is active. Launch one campaign before creators can promote your store."
      />

      <View style={styles.grid}>
        <Card style={styles.primaryCard}>
          <View style={styles.copyStack}>
            <BodyText>• Give creators a reason to promote your store</BodyText>
            <BodyText>• Set your payout and shopper offer</BodyText>
            <BodyText>• Start driving real sales through creators</BodyText>
          </View>

          <Card style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Connected store</Text>
            <BodyText>{brandShopDomain || "No store recorded yet."}</BodyText>
          </Card>

          <PrimaryButton
            label="Create Campaign"
            onPress={() => navigation.navigate("CreateCampaign")}
          />
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
  }
};
