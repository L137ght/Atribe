import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  StatTile
} from "../components";
import { theme } from "../theme";

export default function BrandHomeScreen({ navigation }) {
  const { brandHasActiveCampaign, brandInstallStatus, brandShopDomain } = useAppContext();

  useEffect(() => {
    if (!brandHasActiveCampaign) {
      navigation.replace("CampaignGate");
    }
  }, [brandHasActiveCampaign, navigation]);

  const activeCampaign = brandInstallStatus?.active_campaign || null;

  return (
    <AppShell activeRoute="BrandHome" navigation={navigation}>
      <SectionHeader
        eyebrow="Brand home"
        title="Your creator-powered sales channel is live"
        body="Confirm your store is connected and your first campaign is active."
      />

      <View style={styles.statsRow}>
        <StatTile
          label="Connected shop"
          value={brandInstallStatus?.shop_domain || brandShopDomain || "—"}
          detail="Shopify store connected through the Atribe backend."
        />
        <StatTile
          label="Campaign status"
          value={activeCampaign?.status || "active"}
          detail={activeCampaign?.name || "Creator campaign is live."}
        />
        <StatTile
          label="Commission pool"
          value={
            activeCampaign?.commissionRate
              ? `${Number(activeCampaign.commissionRate) * 100}%`
              : brandInstallStatus?.default_commission_rate
              ? `${Number(brandInstallStatus.default_commission_rate) * 100}%`
              : "Default"
          }
          detail="Campaign pool is split across eligible creators from the magic link."
        />
      </View>

      <Card style={styles.mainCard}>
        <Text style={styles.cardTitle}>Ready for creators</Text>
        <BodyText>
          The Shopify app is installed and at least one active campaign exists for this shop.
        </BodyText>
        <View style={styles.actionsRow}>
          <PrimaryButton label="Create another campaign" onPress={() => navigation.navigate("CreateCampaign")} />
          <SecondaryButton label="View settings" onPress={() => navigation.navigate("Settings")} />
        </View>
      </Card>
    </AppShell>
  );
}

const styles = {
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.lg
  },
  mainCard: {
    gap: theme.spacing.md
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 30,
    lineHeight: 36
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  }
};
