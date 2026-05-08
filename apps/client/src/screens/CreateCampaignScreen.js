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
import { theme } from "../theme";

const DURATION_OPTIONS = [
  { label: "Always on", value: "always_on" },
  { label: "7 days", value: "7_days" },
  { label: "30 days", value: "30_days" }
];

function normalizeOffer(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return {
      shopperOfferType: "none",
      shopperOfferValue: null
    };
  }

  const percentMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*%/i);
  if (percentMatch?.[1]) {
    return {
      shopperOfferType: "percentage",
      shopperOfferValue: percentMatch[1]
    };
  }

  if (/free\s+shipping/i.test(trimmed)) {
    return {
      shopperOfferType: "free_shipping",
      shopperOfferValue: trimmed
    };
  }

  return {
    shopperOfferType: "text",
    shopperOfferValue: trimmed
  };
}

export default function CreateCampaignScreen({ navigation }) {
  const { brandInstallStatus, brandShopDomain, createBrandCampaign } = useAppContext();
  const [campaignName, setCampaignName] = useState("");
  const [shopperOffer, setShopperOffer] = useState("");
  const [creatorPayout, setCreatorPayout] = useState("");
  const [duration, setDuration] = useState("always_on");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shopDomain = brandInstallStatus?.shop_domain || brandShopDomain;
  const offerPreview = useMemo(() => normalizeOffer(shopperOffer), [shopperOffer]);

  async function handleLaunchCampaign() {
    try {
      const normalizedName = campaignName.trim();
      const payoutValue = Number(creatorPayout);

      if (!normalizedName) {
        throw new Error("Enter a campaign name.");
      }

      if (!Number.isFinite(payoutValue) || payoutValue <= 0 || payoutValue > 100) {
        throw new Error("Creator payout must be a number between 0 and 100.");
      }

      setIsSubmitting(true);
      const payload = await createBrandCampaign({
        name: normalizedName,
        shopperOfferType: offerPreview.shopperOfferType,
        shopperOfferValue: offerPreview.shopperOfferValue,
        commissionRate: payoutValue / 100,
        duration
      });

      navigation.replace("CampaignSuccess", {
        campaignId: payload.campaign_id,
        commissionRatePercent: payoutValue,
        shopDomain: payload.shop_domain
      });
    } catch (error) {
      Alert.alert("Campaign wasn’t created", error.message || "Your store is still connected. Try again when you’re ready.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell activeRoute="CreateCampaign" navigation={navigation}>
      <SectionHeader
        eyebrow="First campaign"
        title="Launch a creator campaign for your store"
        body="Set the basic offer and payout so creators know what they are promoting."
      />

      <View style={styles.grid}>
        <Card style={styles.primaryCard}>
          <View style={styles.copyStack}>
            <BodyText>• Offer better deals to shoppers</BodyText>
            <BodyText>• Give creators a reason to promote you</BodyText>
            <BodyText>• Control how much you spend</BodyText>
          </View>

          <InputField
            label="Campaign name"
            placeholder="Launch Drop, Holiday Sale, Creator Promo"
            value={campaignName}
            onChangeText={setCampaignName}
          />
          <InputField
            label="Shopper offer"
            placeholder="10% off, Free shipping, No offer"
            value={shopperOffer}
            onChangeText={setShopperOffer}
          />
          <InputField
            label="Creator payout per sale"
            keyboardType="numeric"
            placeholder="10"
            value={creatorPayout}
            onChangeText={setCreatorPayout}
          />

          <View style={styles.durationStack}>
            <Text style={styles.sectionTitle}>Duration</Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((option) => (
                <SecondaryButton
                  key={option.value}
                  compact
                  label={option.label}
                  selected={duration === option.value}
                  onPress={() => setDuration(option.value)}
                />
              ))}
            </View>
          </View>

          <View style={styles.actionsRow}>
            <PrimaryButton
              label={isSubmitting ? "Launching…" : "Launch campaign"}
              onPress={handleLaunchCampaign}
            />
            <SecondaryButton label="Skip for now" onPress={() => navigation.replace("CampaignGate")} />
          </View>
        </Card>

        <Card style={styles.sideCard}>
          <Text style={styles.sectionTitle}>Campaign preview</Text>
          <BodyText>{shopDomain || "No store connected yet."}</BodyText>
          <BodyText>
            Shopper offer: {offerPreview.shopperOfferValue || "No offer"}
          </BodyText>
          <BodyText>
            Creator payout pool: {creatorPayout ? `${creatorPayout}%` : "Set a payout"}
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
    gap: theme.spacing.sm
  },
  copyStack: {
    gap: theme.spacing.sm
  },
  durationStack: {
    gap: theme.spacing.sm
  },
  durationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 26,
    lineHeight: 32
  }
};
