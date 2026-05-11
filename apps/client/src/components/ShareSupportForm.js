import React, { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Alert, Share, Text, View } from "react-native";
import { useAppContext } from "../context";
import { createShareLink, isAtribeBackendConfigured, supabase } from "../lib";
import { BodyText, Card, InputField, PrimaryButton, SecondaryButton } from "./ui";
import { theme } from "../theme";

function parseCreatorContentPlatform(url) {
  let parsed;
  try {
    parsed = new URL(String(url || "").trim());
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();

  if (/(?:^|\.)youtube\.com$|^youtu\.be$/i.test(hostname)) {
    return { platform: "youtube", contentType: "video" };
  }

  if (/(?:^|\.)instagram\.com$/i.test(hostname)) {
    return { platform: "instagram", contentType: "post" };
  }

  if (/(?:^|\.)x\.com$|(?:^|\.)twitter\.com$/i.test(hostname)) {
    return { platform: "x", contentType: "post" };
  }

  return null;
}

export function ShareLinkSuccess({ shareUrl, shortCode, pointsAwarded }) {
  async function handleCopy() {
    await Clipboard.setStringAsync(shareUrl);
  }

  async function handleShare() {
    await Share.share({
      message: shareUrl,
      url: shareUrl,
    });
  }

  return (
    <Card style={feedbackStyles.successCard}>
      <Text style={feedbackStyles.successTitle}>Your support link is ready.</Text>
      <BodyText>
        Every valid click helps this creator and increases your Support Score.
      </BodyText>

      <View style={feedbackStyles.pointsBadge}>
        <Text style={feedbackStyles.pointsText}>+{pointsAwarded} support points earned</Text>
      </View>

      <View style={feedbackStyles.linkDisplay}>
        <Text style={feedbackStyles.linkUrl} numberOfLines={2}>
          {shareUrl}
        </Text>
      </View>

      <View style={feedbackStyles.actions}>
        <PrimaryButton compact label="Copy link" onPress={handleCopy} />
        <SecondaryButton
          compact
          label="Share"
          onPress={handleShare}
        />
      </View>
    </Card>
  );
}

export default function ShareSupportForm({ selectedCreatorId, onCreated }) {
  const { session } = useAppContext();
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const platform = parseCreatorContentPlatform(url);

  async function handleCreate() {
    setError("");

    if (!url.trim()) {
      setError("Paste a YouTube, Instagram, or X link.");
      return;
    }

    if (!platform) {
      setError("Only YouTube, Instagram, and X/Twitter links are supported.");
      return;
    }

    if (!selectedCreatorId) {
      setError("Select a creator to support.");
      return;
    }

    if (!session?.id || session.mode === "demo") {
      setError("Sign in with a non-demo account to create share links.");
      return;
    }

    if (!isAtribeBackendConfigured) {
      setError("Set EXPO_PUBLIC_ATRIBE_BACKEND_URL to create share links.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      const payload = await createShareLink({
        creatorId: selectedCreatorId,
        originalUrl: url.trim(),
        accessToken,
      });
      setResult(payload);
      if (onCreated) {
        onCreated(payload);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <ShareLinkSuccess
        shareUrl={result.shareUrl}
        shortCode={result.shortCode}
        pointsAwarded={result.pointsAwarded}
      />
    );
  }

  return (
    <View style={formStyles.container}>
      <InputField
        label="Paste a YouTube, Instagram, or X link"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://www.youtube.com/watch?v=abc123"
        value={url}
        onChangeText={(text) => {
          setUrl(text);
          setError("");
        }}
      />

      {platform ? (
        <View style={formStyles.platformTag}>
          <Text style={formStyles.platformTagText}>
            {platform.platform === "youtube"
              ? "YouTube"
              : platform.platform === "instagram"
              ? "Instagram"
              : "X / Twitter"}
          </Text>
        </View>
      ) : null}

      {error ? <BodyText style={formStyles.error}>{error}</BodyText> : null}

      {session?.mode === "demo" ? (
        <BodyText style={formStyles.hint}>
          Demo accounts can explore the share UI, but creating tracked links requires a real signed-in account.
        </BodyText>
      ) : null}

      <PrimaryButton
        label={isSubmitting ? "Creating..." : "Create support link"}
        onPress={handleCreate}
        disabled={isSubmitting || !url.trim()}
      />
    </View>
  );
}

const formStyles = {
  container: {
    gap: theme.spacing.md,
  },
  platformTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(143,1,100,0.16)",
  },
  platformTagText: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  error: {
    color: theme.colors.errorText,
  },
  hint: {
    color: theme.colors.textMuted,
  },
};

const feedbackStyles = {
  successCard: {
    backgroundColor: "rgba(143,1,100,0.08)",
    borderColor: theme.colors.accentBorder,
  },
  successTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34,
  },
  pointsBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(143,1,100,0.2)",
  },
  pointsText: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.8,
  },
  linkDisplay: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  linkUrl: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
};
