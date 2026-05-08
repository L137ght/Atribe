import React, { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useAppContext } from "../context";
import { getDomainFromUrl } from "../utils";
import {
  AppShell,
  BodyText,
  Card,
  InputField,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  StatTile
} from "../components";
import { theme } from "../theme";

export default function AddAffiliateLinksScreen({ navigation }) {
  const {
    addAffiliateLink,
    archiveCreatorBrandLink,
    creatorBrandLinks,
    currentCreator,
    removeAffiliateLink
  } = useAppContext();
  const [linkInput, setLinkInput] = useState("");
  const detectedDomain = useMemo(() => getDomainFromUrl(linkInput), [linkInput]);

  async function handleAddLink() {
    try {
      await addAffiliateLink(linkInput);
      setLinkInput("");
      Alert.alert(
        "Saved",
        detectedDomain?.endsWith(".myshopify.com")
          ? "The Shopify store has been connected through the backend."
          : "The domain has been added to your creator workspace."
      );
    } catch (error) {
      Alert.alert("Affiliate links", error.message);
    }
  }

  return (
    <AppShell
      navigation={navigation}
      activeRoute="AddAffiliateLinks"
      title="Links"
      subtitle="Register affiliate-enabled domains."
    >
      <SectionHeader
        eyebrow="Monetization"
        title="Links"
        body="Add a creator link, let Atribe detect the domain, and keep your supported storefronts organized in one place."
      />

      <View style={styles.grid}>
        <Card style={styles.primaryCard}>
          <InputField
            label="Add new link"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://amazon.in/product/...?... or https://brand.com/?ref=your-id"
            value={linkInput}
            onChangeText={setLinkInput}
          />

          {detectedDomain ? (
            <View style={styles.detectedRow}>
              <Text style={styles.detectedLabel}>Auto-detected</Text>
              <Text style={styles.detectedValue}>{detectedDomain}</Text>
              {detectedDomain.endsWith(".myshopify.com") ? (
                <BodyText>
                  Shopify store domains are connected through the backend creator-brand API.
                </BodyText>
              ) : null}
            </View>
          ) : null}

          <PrimaryButton label="Add to network" onPress={handleAddLink} />

          {currentCreator?.links?.length ? (
            <SecondaryButton
              label="Back to dashboard"
              onPress={() => navigation.navigate("CreatorDashboard")}
            />
          ) : null}
        </Card>

        <View style={styles.sideColumn}>
          <StatTile
            label="Network"
            value={String(currentCreator?.links?.length || 0)}
            detail="Active domains"
          />
          <StatTile
            label="Profile"
            value={currentCreator?.platform || "Creator"}
            detail={currentCreator?.name || "Your workspace"}
          />
        </View>
      </View>

      <Card>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Active connections</Text>
          <Text style={styles.listMeta}>
            {(currentCreator?.links?.length || 0) + (creatorBrandLinks?.filter((link) => link.status !== "archived").length || 0)} total
          </Text>
        </View>

        {currentCreator?.links?.length || creatorBrandLinks?.length ? (
          <>
            {currentCreator?.links?.map((link) => (
            <View key={link.id} style={styles.linkRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.domainName}>{link.domain}</Text>
                <BodyText numberOfLines={2}>{link.url}</BodyText>
              </View>
              <SecondaryButton
                label="Remove"
                onPress={() => removeAffiliateLink(link.id)}
                compact
              />
            </View>
            ))}
            {creatorBrandLinks
              ?.filter((link) => link.status !== "archived")
              .map((link) => (
                <View key={link.id} style={styles.linkRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.domainName}>{link.shopDomain}</Text>
                    <BodyText numberOfLines={2}>
                      Shopify store connection · status {link.status}
                    </BodyText>
                  </View>
                  <SecondaryButton
                    label="Remove"
                    onPress={() => archiveCreatorBrandLink(link.id)}
                    compact
                  />
                </View>
              ))}
          </>
        ) : (
          <BodyText>
            Your creator dashboard needs at least one domain before the new flow can route links through your profile.
          </BodyText>
        )}
      </Card>
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
    minWidth: 320
  },
  sideColumn: {
    width: 280,
    gap: theme.spacing.md
  },
  detectedRow: {
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    gap: 6
  },
  detectedLabel: {
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: theme.fonts.sans
  },
  detectedValue: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.sans
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  listTitle: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontFamily: theme.fonts.serif
  },
  listMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontFamily: theme.fonts.sans,
    fontWeight: "700"
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle
  },
  domainName: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.serif
  }
};
