import React, { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  InputField,
  PrimaryButton,
  SecondaryButton,
  SectionHeader
} from "../components";
import {
  isAtribeBackendConfigured,
  normalizeShopifyShopDomain
} from "../lib";
import { theme } from "../theme";

export default function BrandOnboardingScreen({ navigation }) {
  const {
    brandHasActiveCampaign,
    brandInstallStatus,
    brandInstallStatusLoading,
    brandShopDomain,
    refreshBrandInstallStatus,
    setBrandShopDomain
  } = useAppContext();
  const [shopDomainInput, setShopDomainInput] = useState(brandShopDomain || "");
  const normalizedShopDomain = useMemo(
    () => normalizeShopifyShopDomain(shopDomainInput),
    [shopDomainInput]
  );
  const isConnected = brandInstallStatus?.install_status === "installed";

  async function handleConnectShopify() {
    try {
      if (!isAtribeBackendConfigured) {
        throw new Error(
          "Atribe backend URL is not configured. Set EXPO_PUBLIC_ATRIBE_BACKEND_URL before connecting Shopify."
        );
      }

      const resolvedShopDomain = await setBrandShopDomain(shopDomainInput);
      navigation.navigate("BrandConnecting", {
        shopDomain: resolvedShopDomain
      });
    } catch (error) {
      Alert.alert("Connect Shopify", error.message);
    }
  }

  async function handleRefreshStatus() {
    try {
      await refreshBrandInstallStatus(normalizedShopDomain || brandShopDomain);
    } catch (error) {
      Alert.alert("Shopify connection", error.message);
    }
  }

  function handleContinue() {
    navigation.navigate(brandHasActiveCampaign ? "BrandHome" : "CampaignGate");
  }

  return (
    <AppShell activeRoute="BrandHome" navigation={navigation}>
      <SectionHeader
        eyebrow="Brand setup"
        title="Turn your store into a creator-powered sales channel"
        body="Connect Shopify once, then let creators drive real purchases to your store."
      />

      <View style={styles.grid}>
        <Card style={styles.primaryCard}>
          <View style={styles.copyStack}>
            <BodyText>• Let creators drive real purchases to your store</BodyText>
            <BodyText>• Reach new shoppers through trusted voices</BodyText>
            <BodyText>• Track and manage conversions in one place</BodyText>
            <BodyText>• Pay only when a sale happens</BodyText>
          </View>

          {!isAtribeBackendConfigured ? (
            <Card style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Backend configuration required</Text>
              <BodyText>
                Shopify connection is currently unavailable in this build.
              </BodyText>
            </Card>
          ) : null}

          {isConnected ? (
            <Card style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Your store is already connected</Text>
              <BodyText>
                Creators can already promote your products and orders are being tracked automatically.
              </BodyText>
              <BodyText>{brandInstallStatus?.shop_domain || brandShopDomain}</BodyText>
            </Card>
          ) : null}

          <InputField
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            label="Shopify store domain"
            placeholder="your-store.myshopify.com"
            value={shopDomainInput}
            onChangeText={setShopDomainInput}
          />

          <View style={styles.actionsRow}>
            <PrimaryButton
              label={isConnected ? "Continue" : "Connect Shopify"}
              onPress={isConnected ? handleContinue : handleConnectShopify}
            />
            <SecondaryButton
              label={isConnected ? "Refresh status" : "Maybe later"}
              onPress={isConnected ? handleRefreshStatus : () => navigation.navigate("Settings")}
            />
          </View>
        </Card>

        <Card style={styles.sideCard}>
          <Text style={styles.sideTitle}>Connection status</Text>
          <BodyText>
            {brandInstallStatusLoading
              ? "Checking your current Shopify connection."
              : brandShopDomain
              ? `Current store target: ${brandShopDomain}`
              : "No Shopify store has been saved yet."}
          </BodyText>
          <BodyText>
            {brandHasActiveCampaign
              ? "An active campaign already exists for this store."
              : "You can connect Shopify first and launch your first campaign after that."}
          </BodyText>
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
  sideCard: {
    width: 320,
    gap: theme.spacing.md
  },
  copyStack: {
    gap: theme.spacing.sm
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  noticeCard: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated
  },
  noticeTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 26,
    lineHeight: 32
  },
  sideTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34
  }
};
