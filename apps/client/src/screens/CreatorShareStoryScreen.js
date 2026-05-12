import React, { useMemo, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { Alert, Platform, Text, useWindowDimensions, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  CreatorStoryCard,
  PrimaryButton,
  SecondaryButton,
  SectionHeader
} from "../components";
import { buildCreatorProfileUrl } from "../utils";
import { theme } from "../theme";

function normalizeHandle(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function getCreatorHandle(currentCreator, creatorSocialAccounts) {
  const profileHandle =
    currentCreator?.handle ||
    currentCreator?.username ||
    currentCreator?.profileHandle ||
    currentCreator?.publicHandle ||
    currentCreator?.slug;

  if (profileHandle) {
    return normalizeHandle(profileHandle);
  }

  const instagramAccount = (creatorSocialAccounts || []).find(
    (account) => account.platform === "instagram" && account.username
  );
  const firstAccount = (creatorSocialAccounts || []).find((account) => account.username);

  return normalizeHandle(instagramAccount?.username || firstAccount?.username || "");
}

export default function CreatorShareStoryScreen({ navigation }) {
  const { creatorSocialAccounts, currentCreator, session } = useAppContext();
  const { width } = useWindowDimensions();
  const cardRef = useRef(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const profileUrl = useMemo(() => buildCreatorProfileUrl(currentCreator), [currentCreator]);
  const creatorHandle = useMemo(
    () => getCreatorHandle(currentCreator, creatorSocialAccounts),
    [creatorSocialAccounts, currentCreator]
  );
  const previewWidth = Math.min(Math.max(width - theme.spacing.xl * 2, 280), 390);

  async function handleShareStoryCard() {
    setStatusMessage("");
    setIsSharing(true);

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          "Sharing unavailable",
          "Native image sharing is not available on this device. You can still copy your profile link."
        );
        return;
      }

      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile"
      });

      await Sharing.shareAsync(uri, {
        dialogTitle: "Share your Atribe story",
        mimeType: "image/png",
        UTI: "public.png"
      });
    } catch (error) {
      Alert.alert(
        "Could not share card",
        error?.message || "The story card could not be exported. Please try again."
      );
    } finally {
      setIsSharing(false);
    }
  }

  async function handleCopyProfileLink() {
    try {
      await Clipboard.setStringAsync(profileUrl);
      setStatusMessage("Profile link copied");
    } catch (error) {
      Alert.alert(
        "Could not copy link",
        error?.message || "Copying is unavailable on this device."
      );
    }
  }

  return (
    <AppShell navigation={navigation} activeRoute="CreatorShareStory">
      <SectionHeader
        eyebrow="Share to story"
        title="Share your Atribe story"
        body="Post this card to invite your audience to support your work at no extra cost."
        action={
          <SecondaryButton
            compact
            label="Back"
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate("CreatorDashboard")
            }
          />
        }
      />

      <View style={styles.layout}>
        <View style={styles.previewColumn}>
          <View
            collapsable={false}
            ref={cardRef}
            style={[styles.previewFrame, { width: previewWidth }]}
          >
            <CreatorStoryCard
              creator={currentCreator}
              creatorHandle={creatorHandle}
              fallbackPhotoUrl={session?.photoUrl}
            />
          </View>
        </View>

        <Card style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Ready to post</Text>
          <BodyText>
            Share exports only the story card. Add the copied profile URL as your Instagram
            link sticker before posting.
          </BodyText>

          <View style={styles.profileUrlBox}>
            <Text numberOfLines={2} style={styles.profileUrl}>
              {profileUrl}
            </Text>
          </View>

          <PrimaryButton
            label={isSharing ? "Preparing card..." : "Share Story Card"}
            onPress={handleShareStoryCard}
            disabled={isSharing}
            variant="gradient"
          />
          <SecondaryButton label="Copy Profile Link" onPress={handleCopyProfileLink} />

          {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
          {Platform.OS === "web" ? (
            <BodyText style={styles.webNote}>
              Web preview support depends on the browser. Copy Profile Link remains available.
            </BodyText>
          ) : null}
        </Card>
      </View>
    </AppShell>
  );
}

const styles = {
  layout: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: theme.spacing.xl
  },
  previewColumn: {
    flex: 1,
    minWidth: 300,
    alignItems: "center"
  },
  previewFrame: {
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,175,214,0.16)",
    backgroundColor: theme.colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.32,
    shadowRadius: 34,
    elevation: 10
  },
  actionsCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: 430,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.accentBorder
  },
  actionsTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 30,
    lineHeight: 36
  },
  profileUrlBox: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: "rgba(255,255,255,0.03)"
  },
  profileUrl: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },
  statusText: {
    color: theme.colors.successText,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },
  webNote: {
    color: theme.colors.textMuted
  }
};
