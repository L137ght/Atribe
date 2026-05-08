import React, { useEffect, useMemo } from "react";
import { Alert, Text, View } from "react-native";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  PrimaryButton,
  SecondaryButton,
  SectionHeader
} from "../components";
import { normalizeShopifyShopDomain } from "../lib";
import { theme } from "../theme";

export default function BrandShopifySuccessScreen({ navigation, route }) {
  const {
    brandInstallStatus,
    brandInstallStatusLoading,
    brandShopDomain,
    refreshBrandInstallStatus,
    setBrandShopDomain
  } = useAppContext();
  const shopDomain = useMemo(
    () => normalizeShopifyShopDomain(route?.params?.shop || brandShopDomain),
    [brandShopDomain, route?.params?.shop]
  );

  useEffect(() => {
    let isMounted = true;

    async function syncConnectedShop() {
      if (!shopDomain) {
        return;
      }

      try {
        await setBrandShopDomain(shopDomain);
        if (isMounted) {
          await refreshBrandInstallStatus(shopDomain);
        }
      } catch (error) {
        Alert.alert("Shopify connection", error.message);
      }
    }

    void syncConnectedShop();

    return () => {
      isMounted = false;
    };
  }, [refreshBrandInstallStatus, setBrandShopDomain, shopDomain]);

  return (
    <AppShell activeRoute="BrandHome" navigation={navigation}>
      <SectionHeader
        eyebrow="Connected"
        title="Your store is now powered by creators"
        body="You are ready to launch your first creator campaign."
      />

      <View style={styles.grid}>
        <Card style={styles.primaryCard}>
          <View style={styles.copyStack}>
            <BodyText>• Creators can now start driving sales to your store</BodyText>
            <BodyText>• Every order will be tracked automatically</BodyText>
            <BodyText>• You only pay when a sale happens</BodyText>
          </View>

          <Card style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Connected shop</Text>
            <BodyText>{brandInstallStatus?.shop_domain || shopDomain || "Resolving store domain…"}</BodyText>
            <BodyText>
              {brandInstallStatusLoading
                ? "Checking store status."
                : brandInstallStatus?.install_status === "installed"
                ? "Shopify connection is active."
                : "Waiting for Shopify install confirmation."}
            </BodyText>
          </Card>

          <View style={styles.actionsRow}>
            <PrimaryButton
              label="Create your first campaign"
              onPress={() => navigation.navigate("CreateCampaign")}
            />
            <SecondaryButton
              label="Skip for now"
              onPress={() => navigation.replace("CampaignGate")}
            />
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
