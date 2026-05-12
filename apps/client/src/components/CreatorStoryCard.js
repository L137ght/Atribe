import React from "react";
import { Image, Platform, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "A";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getCreatorImageUrl(creator, fallbackPhotoUrl) {
  return (
    creator?.photoUrl ||
    creator?.avatarUrl ||
    creator?.avatar_url ||
    creator?.profileImageUrl ||
    creator?.imageUrl ||
    fallbackPhotoUrl ||
    ""
  );
}

export default function CreatorStoryCard({
  creator,
  creatorHandle,
  fallbackPhotoUrl,
  style
}) {
  const displayName = creator?.name || creator?.displayName || "Atribe creator";
  const imageUrl = getCreatorImageUrl(creator, fallbackPhotoUrl);
  const handle = creatorHandle ? String(creatorHandle).trim() : "";

  return (
    <LinearGradient
      colors={["#140a10", "#24121b", "#3c0028", "#12070d"]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.card, style]}
    >
      <View pointerEvents="none" style={styles.haloTop} />
      <View pointerEvents="none" style={styles.haloBottom} />
      <View pointerEvents="none" style={styles.orbitOne} />
      <View pointerEvents="none" style={styles.orbitTwo} />
      <Text style={[styles.spark, styles.sparkOne]}>✦</Text>
      <Text style={[styles.spark, styles.sparkTwo]}>✦</Text>
      <Text style={[styles.spark, styles.sparkThree]}>✦</Text>

      <View style={styles.wordmarkRow}>
        <Text style={styles.wordmark}>atribe</Text>
        <Text style={styles.wordmarkSpark}>✦</Text>
      </View>

      <View style={styles.identityBlock}>
        <View style={styles.avatarOuter}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
          ) : (
            <LinearGradient
              colors={[theme.colors.accentSoft, theme.colors.accent, "#3c0028"]}
              style={styles.avatarFallback}
            >
              <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
            </LinearGradient>
          )}
        </View>
        <Text numberOfLines={1} style={styles.creatorName}>
          {displayName}
        </Text>
        {handle ? (
          <Text numberOfLines={1} style={styles.creatorHandle}>
            {handle.startsWith("@") ? handle : `@${handle}`}
          </Text>
        ) : null}
      </View>

      <View style={styles.messageBlock}>
        <Text style={styles.headline}>Want to support what I make?</Text>
        <Text style={styles.secondaryLine}>
          Join Atribe and Support me at no extra cost
        </Text>
      </View>

      <View style={styles.linkStickerCue}>
        <Text style={styles.linkIcon}>↗</Text>
        <Text style={styles.linkStickerText}>Tap my link sticker</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerRule} />
        <Text style={styles.footerText}>Powered by Atribe</Text>
      </View>
    </LinearGradient>
  );
}

const styles = {
  card: {
    aspectRatio: 9 / 16,
    borderRadius: 30,
    overflow: "hidden",
    paddingHorizontal: 30,
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.bgPrimary,
    position: "relative"
  },
  haloTop: {
    position: "absolute",
    top: -80,
    right: -84,
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: "rgba(255,175,214,0.18)"
  },
  haloBottom: {
    position: "absolute",
    bottom: -96,
    left: -66,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "rgba(143,1,100,0.36)"
  },
  orbitOne: {
    position: "absolute",
    top: "22%",
    left: -42,
    width: 300,
    height: 150,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,175,214,0.16)",
    transform: [{ rotate: "-24deg" }]
  },
  orbitTwo: {
    position: "absolute",
    bottom: "17%",
    right: -88,
    width: 240,
    height: 120,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    transform: [{ rotate: "-18deg" }]
  },
  spark: {
    position: "absolute",
    color: theme.colors.accentSoft,
    fontSize: 26,
    lineHeight: 28,
    textShadowColor: "rgba(255,175,214,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14
  },
  sparkOne: {
    top: "20%",
    left: 34
  },
  sparkTwo: {
    top: "15%",
    right: 42,
    fontSize: 20
  },
  sparkThree: {
    bottom: "30%",
    left: 48,
    fontSize: 18
  },
  wordmarkRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5
  },
  wordmark: {
    color: "#f8eaf0",
    fontFamily: theme.fonts.sans,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -1.2
  },
  wordmarkSpark: {
    color: theme.colors.accentSoft,
    fontSize: 17,
    lineHeight: 18,
    marginTop: 1
  },
  identityBlock: {
    width: "100%",
    alignItems: "center",
    gap: 6,
    marginTop: 4
  },
  avatarOuter: {
    width: 88,
    height: 88,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0 18px 44px rgba(0,0,0,0.32)"
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.32,
        shadowRadius: 22,
        elevation: 8
      }
    })
  },
  avatarImage: {
    width: "100%",
    height: "100%"
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarInitials: {
    color: "#fff7fb",
    fontFamily: theme.fonts.sans,
    fontSize: 28,
    fontWeight: "800"
  },
  creatorName: {
    maxWidth: "90%",
    color: "#fff7fb",
    fontFamily: theme.fonts.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    textAlign: "center"
  },
  creatorHandle: {
    maxWidth: "90%",
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    textAlign: "center"
  },
  messageBlock: {
    width: "100%",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 2
  },
  headline: {
    color: "#fff7fb",
    fontFamily: theme.fonts.serif,
    fontSize: 39,
    lineHeight: 43,
    fontWeight: "400",
    textAlign: "center",
    letterSpacing: -1.2
  },
  secondaryLine: {
    color: "#f4dce6",
    fontFamily: theme.fonts.sans,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
    textAlign: "center"
  },
  linkStickerCue: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,175,214,0.18)"
  },
  linkIcon: {
    color: theme.colors.accentSoft,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "900"
  },
  linkStickerText: {
    color: "#ffe9f4",
    fontFamily: theme.fonts.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800"
  },
  footer: {
    width: "100%",
    alignItems: "center",
    gap: 12
  },
  footerRule: {
    width: 96,
    height: 1,
    backgroundColor: "rgba(255,175,214,0.25)"
  },
  footerText: {
    color: "rgba(255,233,244,0.82)",
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    letterSpacing: 0.2
  }
};
