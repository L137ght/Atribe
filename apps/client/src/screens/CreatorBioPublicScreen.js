import React, { useEffect, useMemo, useState } from "react";
import { Image, Linking, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { fetchCreatorBio, isAtribeBackendConfigured, isSupabaseConfigured, supabase } from "../lib";
import { buildCreatorProfileUrl } from "../utils";
import { GradientWordmark } from "../components";
import { theme } from "../theme";

const platformLabels = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X"
};

function formatDate(value) {
  if (!value) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function mapSupabasePublicPage(page, contentItems = []) {
  const creator = page.creator_profiles || {};
  return {
    id: page.id,
    creatorId: page.creator_id,
    headline: page.headline || "",
    bio: page.bio || creator.bio || "",
    creator: {
      id: creator.id || page.creator_id,
      displayName: creator.display_name || "Atribe creator",
      avatarUrl: creator.profiles?.avatar_url || "",
      bio: creator.bio || ""
    },
    latestContent: contentItems.map((item) => ({
      id: item.id,
      platform: item.platform,
      title: item.title || "",
      caption: item.caption || "",
      thumbnailUrl: item.thumbnail_url || "",
      contentUrl: item.content_url,
      publishedAt: item.published_at || null
    })),
    manualLinks: (page.creator_bio_manual_links || []).map((link) => ({
      id: link.id,
      label: link.label,
      url: link.url,
      category: link.category,
      isEnabled: link.is_enabled
    }))
  };
}

async function fetchCreatorBioFromSupabase(identifier) {
  const normalized = String(identifier || "").trim();
  const looksLikeId = /^[0-9a-f-]{36}$/i.test(normalized);

  let query = supabase
    .from("creator_bio_pages")
    .select(
      `
        id,
        creator_id,
        headline,
        bio,
        is_published,
        creator_profiles (
          id,
          display_name,
          bio,
          profiles (
            avatar_url
          )
        ),
        creator_bio_manual_links (
          id,
          label,
          url,
          category,
          sort_order,
          is_enabled
        ),
        creator_bio_platforms (
          is_enabled,
          creator_social_account_id
        )
      `
    )
    .eq("is_published", true);

  query = looksLikeId ? query.eq("creator_id", normalized) : query.eq("slug", normalized.replace(/^@/, ""));

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  const accountIds = (data.creator_bio_platforms || [])
    .filter((row) => row.is_enabled)
    .map((row) => row.creator_social_account_id);
  let contentItems = [];

  if (accountIds.length > 0) {
    const { data: contentData, error: contentError } = await supabase
      .from("creator_social_content_items")
      .select("id, platform, title, caption, thumbnail_url, content_url, published_at")
      .in("creator_social_account_id", accountIds)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(8);

    if (contentError) {
      throw contentError;
    }

    contentItems = contentData || [];
  }

  return mapSupabasePublicPage(data, contentItems);
}

export default function CreatorBioPublicScreen({ navigation, route }) {
  const identifier = route?.params?.creatorId || route?.params?.slug || "";
  const [page, setPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const supportUrl = useMemo(() => {
    if (!page?.creator) {
      return "https://atribe.io";
    }
    return buildCreatorProfileUrl({
      id: page.creator.id,
      name: page.creator.displayName
    });
  }, [page]);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setError("");

      try {
        let payload = null;
        if (isAtribeBackendConfigured) {
          payload = await fetchCreatorBio(identifier);
        } else if (isSupabaseConfigured) {
          payload = await fetchCreatorBioFromSupabase(identifier);
        }

        if (isMounted) {
          setPage(payload);
          if (!payload) {
            setError("This creator bio page is not available yet.");
          }
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "This creator bio page is not available yet.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [identifier]);

  function openUrl(url) {
    if (!url) {
      return;
    }
    if (Platform.OS === "web") {
      window.location.assign(url);
      return;
    }
    Linking.openURL(url);
  }

  function goHome() {
    navigation?.navigate?.("Landing");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={goHome}>
            <GradientWordmark />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateTitle}>Loading creator page</Text>
          </View>
        ) : error ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateTitle}>Page unavailable</Text>
            <Text style={styles.bodyText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.page}>
            <View style={styles.header}>
              {page.creator.avatarUrl ? (
                <Image source={{ uri: page.creator.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{page.creator.displayName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.name}>{page.creator.displayName}</Text>
              {page.headline ? <Text style={styles.handle}>{page.headline}</Text> : null}
              <Text style={styles.bio}>{page.bio || page.creator.bio}</Text>

              <Pressable onPress={() => openUrl(supportUrl)} style={styles.supportCta}>
                <Text style={styles.supportText}>Support me through Atribe</Text>
                <Text style={styles.supportSubtext}>
                  Join my Atribe and support my work when you shop at no extra cost.
                </Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Latest from me</Text>
              {page.latestContent.length > 0 ? (
                <View style={styles.contentGrid}>
                  {page.latestContent.map((item) => (
                    <Pressable key={item.id} onPress={() => openUrl(item.contentUrl)} style={styles.contentCard}>
                      {item.thumbnailUrl ? (
                        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
                      ) : null}
                      <View style={styles.contentCopy}>
                        <Text style={styles.badge}>{platformLabels[item.platform] || item.platform}</Text>
                        <Text numberOfLines={2} style={styles.contentTitle}>
                          {item.title || item.caption || "Latest post"}
                        </Text>
                        {item.publishedAt ? (
                          <Text style={styles.metaText}>{formatDate(item.publishedAt)}</Text>
                        ) : null}
                        <Text style={styles.actionText}>{item.platform === "youtube" ? "Watch video" : "View post"}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.bodyText}>New posts will appear here when this creator syncs supported platforms.</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>More links</Text>
              {page.manualLinks.length > 0 ? (
                <View style={styles.linkList}>
                  {page.manualLinks.map((link) => (
                    <Pressable key={link.id} onPress={() => openUrl(link.url)} style={styles.manualLink}>
                      <Text style={styles.manualLinkText}>{link.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.bodyText}>No custom links yet.</Text>
              )}
            </View>

            <Pressable onPress={goHome} style={styles.footerBrand}>
              <Text style={styles.footerText}>Powered by Atribe</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary
  },
  scrollContent: {
    minHeight: "100%",
    padding: theme.spacing.lg,
    alignItems: "center"
  },
  topBar: {
    width: "100%",
    maxWidth: 760,
    marginBottom: theme.spacing.lg
  },
  page: {
    width: "100%",
    maxWidth: 760,
    gap: theme.spacing.xl
  },
  header: {
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle
  },
  avatarInitial: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 42
  },
  name: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 42,
    lineHeight: 48,
    textAlign: "center"
  },
  handle: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center"
  },
  bio: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 560
  },
  supportCta: {
    width: "100%",
    marginTop: theme.spacing.md,
    borderRadius: 14,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    alignItems: "center",
    gap: 6
  },
  supportText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 18,
    fontWeight: "800"
  },
  supportSubtext: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  section: {
    gap: theme.spacing.md
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34
  },
  contentGrid: {
    gap: theme.spacing.md
  },
  contentCard: {
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceElevated
  },
  thumbnail: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.surface
  },
  contentCopy: {
    padding: theme.spacing.md,
    gap: 6
  },
  badge: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  contentTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800"
  },
  metaText: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 13
  },
  actionText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: "800"
  },
  linkList: {
    gap: theme.spacing.sm
  },
  manualLink: {
    borderRadius: 12,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    alignItems: "center"
  },
  manualLinkText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 16,
    fontWeight: "800"
  },
  bodyText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    lineHeight: 22
  },
  stateBlock: {
    width: "100%",
    maxWidth: 560,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated
  },
  stateTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 30
  },
  footerBrand: {
    alignItems: "center",
    paddingBottom: theme.spacing.xl
  },
  footerText: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  }
};
