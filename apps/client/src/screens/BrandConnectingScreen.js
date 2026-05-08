import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import * as ExpoLinking from "expo-linking";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  PrimaryButton,
  SecondaryButton,
  SectionHeader
} from "../components";
import {
  buildBrandShopifyInstallUrl,
  isAtribeBackendConfigured,
  normalizeShopifyShopDomain
} from "../lib";
import { theme } from "../theme";

export default function BrandConnectingScreen({ navigation, route }) {
  const { refreshBrandInstallStatus, setBrandShopDomain } = useAppContext();
  const [message, setMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const hasOpenedRef = useRef(false);
  const shopDomain = useMemo(
    () => normalizeShopifyShopDomain(route?.params?.shopDomain),
    [route?.params?.shopDomain]
  );

  async function openInstallFlow() {
    if (!isAtribeBackendConfigured) {
      setMessage("Atribe backend URL is not configured.");
      return;
    }

    if (!shopDomain) {
      setMessage("Enter a valid Shopify store domain before continuing.");
      return;
    }

    try {
      await setBrandShopDomain(shopDomain);
      const installUrl = buildBrandShopifyInstallUrl({
        shopDomain,
        mobileRedirect: ExpoLinking.createURL("brand/shopify-connected")
      });
      await Linking.openURL(installUrl);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleCheckStatus() {
    if (!shopDomain) {
      return;
    }

    setIsChecking(true);
    try {
      const status = await refreshBrandInstallStatus(shopDomain);
      if (status?.install_status === "installed") {
        navigation.replace("BrandShopifySuccess", {
          shop: status.shop_domain || shopDomain
        });
        return;
      }

      setMessage("Your store wasn’t connected yet. Try again to start driving sales through creators.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    if (hasOpenedRef.current) {
      return;
    }

    hasOpenedRef.current = true;
    void openInstallFlow();
  }, [shopDomain]);

  return (
    <AppShell activeRoute="BrandHome" navigation={navigation}>
      <SectionHeader
        eyebrow="Connecting Shopify"
        title="Setting up your creator-powered sales channel…"
        body="This takes a few seconds."
      />

      <View style={styles.grid}>
        <Card style={styles.primaryCard}>
          <Text style={styles.cardTitle}>Store target</Text>
          <BodyText>{shopDomain || "No Shopify store domain provided."}</BodyText>
          {message ? (
            <Card style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Your store wasn’t connected</Text>
              <BodyText>No changes were made to your store.</BodyText>
              <BodyText>{message}</BodyText>
            </Card>
          ) : null}

          <View style={styles.actionsRow}>
            <PrimaryButton label="Open Shopify" onPress={openInstallFlow} />
            <SecondaryButton
              label={isChecking ? "Checking…" : "I connected my store"}
              onPress={handleCheckStatus}
            />
          </View>
        </Card>

        <Card style={styles.sideCard}>
          <Text style={styles.cardTitle}>What happens next</Text>
          <BodyText>• Confirm the Atribe app install in Shopify</BodyText>
          <BodyText>• Return to Atribe after the store is connected</BodyText>
          <BodyText>• Launch your first creator campaign</BodyText>
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
    gap: theme.spacing.sm
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  noticeCard: {
    gap: theme.spacing.sm
  },
  noticeTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    lineHeight: 30
  }
};
