import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform, Pressable, Share, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useAppContext } from "../context";
import { SOCIAL_ACCOUNT_PLATFORMS } from "../data";
import { isAtribeBackendConfigured, isSupabaseConfigured, supabase, syncCreatorBioContent } from "../lib";
import { buildCreatorBioUrl } from "../utils";
import {
  AppShell,
  BodyText,
  Card,
  InputField,
  Kicker,
  PrimaryButton,
  SecondaryButton,
  SectionHeader
} from "../components";
import { theme } from "../theme";

const AUTO_CONTENT_PLATFORMS = new Set(["instagram", "youtube", "tiktok", "x"]);

const platformNames = SOCIAL_ACCOUNT_PLATFORMS.reduce((acc, platform) => {
  acc[platform.id] = platform.name;
  return acc;
}, {});

function buildDemoPage(currentCreator) {
  return {
    id: "demo-bio-page",
    creator_id: currentCreator?.id,
    is_published: true,
    headline: currentCreator?.spotlight || "Atribe creator",
    bio: currentCreator?.bio || "",
    theme: {}
  };
}

function getAccountStatus(account) {
  if (!AUTO_CONTENT_PLATFORMS.has(account.platform)) {
    return "Manual links only";
  }
  if (account.status !== "connected") {
    return "Needs reconnect";
  }
  if (account.last_synced_at) {
    return `Synced ${new Date(account.last_synced_at).toLocaleDateString()}`;
  }
  return "Ready for content sync";
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  return `https://${raw}`;
}

export default function CreatorBioPageScreen({ navigation }) {
  const { creatorSocialAccounts, currentCreator, session } = useAppContext();
  const [bioPage, setBioPage] = useState(null);
  const [platformRows, setPlatformRows] = useState([]);
  const [manualLinks, setManualLinks] = useState([]);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");

  const publicUrl = useMemo(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return buildCreatorBioUrl(currentCreator, window.location.origin);
    }
    return buildCreatorBioUrl(currentCreator);
  }, [currentCreator]);

  const includedAccountIds = useMemo(
    () => new Set(platformRows.filter((row) => row.is_enabled).map((row) => row.creator_social_account_id)),
    [platformRows]
  );

  const loadBioPage = useCallback(async () => {
    if (!currentCreator?.id) {
      return;
    }

    setIsLoading(true);
    setError("");

    if (session?.mode === "demo" || !isSupabaseConfigured) {
      const page = buildDemoPage(currentCreator);
      setBioPage(page);
      setPlatformRows(
        (creatorSocialAccounts || []).map((account, index) => ({
          id: `demo-bio-platform-${account.id}`,
          creator_bio_page_id: page.id,
          creator_social_account_id: account.id,
          is_enabled: AUTO_CONTENT_PLATFORMS.has(account.platform),
          sort_order: index
        }))
      );
      setManualLinks([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data: pageData, error: pageError } = await supabase
        .from("creator_bio_pages")
        .upsert(
          {
            creator_id: currentCreator.id,
            is_published: true,
            headline: currentCreator.spotlight || currentCreator.niche || null,
            bio: currentCreator.bio || null,
            theme: {}
          },
          { onConflict: "creator_id" }
        )
        .select("*")
        .single();

      if (pageError) {
        throw pageError;
      }

      const platformUpserts = (creatorSocialAccounts || []).map((account, index) => ({
        creator_bio_page_id: pageData.id,
        creator_social_account_id: account.id,
        is_enabled: AUTO_CONTENT_PLATFORMS.has(account.platform),
        sort_order: index
      }));

      if (platformUpserts.length > 0) {
        const { error: platformError } = await supabase
          .from("creator_bio_platforms")
          .upsert(platformUpserts, {
            onConflict: "creator_bio_page_id,creator_social_account_id",
            ignoreDuplicates: true
          });

        if (platformError) {
          throw platformError;
        }
      }

      const [{ data: platformData, error: platformsError }, { data: linkData, error: linksError }] =
        await Promise.all([
          supabase
            .from("creator_bio_platforms")
            .select("*")
            .eq("creator_bio_page_id", pageData.id)
            .order("sort_order", { ascending: true }),
          supabase
            .from("creator_bio_manual_links")
            .select("*")
            .eq("creator_bio_page_id", pageData.id)
            .order("sort_order", { ascending: true })
        ]);

      if (platformsError) {
        throw platformsError;
      }
      if (linksError) {
        throw linksError;
      }

      setBioPage(pageData);
      setPlatformRows(platformData || []);
      setManualLinks(linkData || []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load your bio page settings.");
    } finally {
      setIsLoading(false);
    }
  }, [creatorSocialAccounts, currentCreator, session?.mode]);

  useEffect(() => {
    loadBioPage();
  }, [loadBioPage]);

  async function togglePlatform(account) {
    const existing = platformRows.find((row) => row.creator_social_account_id === account.id);
    const nextEnabled = !existing?.is_enabled;

    if (session?.mode === "demo" || !isSupabaseConfigured) {
      setPlatformRows((current) =>
        current.map((row) =>
          row.creator_social_account_id === account.id ? { ...row, is_enabled: nextEnabled } : row
        )
      );
      return;
    }

    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("creator_bio_platforms")
        .update({ is_enabled: nextEnabled })
        .eq("id", existing.id);

      if (updateError) {
        throw updateError;
      }

      setPlatformRows((current) =>
        current.map((row) => (row.id === existing.id ? { ...row, is_enabled: nextEnabled } : row))
      );
    } catch (saveError) {
      Alert.alert("Link in Bio", saveError.message || "Could not update that platform.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addManualLink() {
    const normalizedLabel = label.trim();
    const normalizedUrl = normalizeUrl(url);

    if (!normalizedLabel || !normalizedUrl) {
      Alert.alert("Manual link", "Add a label and URL first.");
      return;
    }

    try {
      const parsed = new URL(normalizedUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Use an http or https URL.");
      }
    } catch (validationError) {
      Alert.alert("Manual link", validationError.message || "Enter a valid URL.");
      return;
    }

    if (session?.mode === "demo" || !isSupabaseConfigured) {
      setManualLinks((current) => [
        ...current,
        {
          id: `demo-manual-link-${Date.now()}`,
          label: normalizedLabel,
          url: normalizedUrl,
          category: "custom",
          sort_order: current.length,
          is_enabled: true
        }
      ]);
      setLabel("");
      setUrl("");
      return;
    }

    if (!bioPage?.id) {
      return;
    }

    setIsSaving(true);
    try {
      const { data, error: insertError } = await supabase
        .from("creator_bio_manual_links")
        .insert({
          creator_bio_page_id: bioPage.id,
          label: normalizedLabel,
          url: normalizedUrl,
          category: "custom",
          sort_order: manualLinks.length,
          is_enabled: true
        })
        .select("*")
        .single();

      if (insertError) {
        throw insertError;
      }

      setManualLinks((current) => [...current, data]);
      setLabel("");
      setUrl("");
    } catch (saveError) {
      Alert.alert("Manual link", saveError.message || "Could not add that link.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleManualLink(link) {
    const nextEnabled = !link.is_enabled;

    if (session?.mode === "demo" || !isSupabaseConfigured) {
      setManualLinks((current) =>
        current.map((item) => (item.id === link.id ? { ...item, is_enabled: nextEnabled } : item))
      );
      return;
    }

    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("creator_bio_manual_links")
        .update({ is_enabled: nextEnabled })
        .eq("id", link.id);

      if (updateError) {
        throw updateError;
      }

      setManualLinks((current) =>
        current.map((item) => (item.id === link.id ? { ...item, is_enabled: nextEnabled } : item))
      );
    } catch (saveError) {
      Alert.alert("Manual link", saveError.message || "Could not update that link.");
    } finally {
      setIsSaving(false);
    }
  }

  async function copyPublicUrl() {
    await Clipboard.setStringAsync(publicUrl);
    Alert.alert("Copied", "Your public bio URL is on your clipboard.");
  }

  async function sharePublicUrl() {
    if (Platform.OS === "web") {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Atribe Link in Bio", url: publicUrl });
        return;
      }
      await copyPublicUrl();
      return;
    }

    await Share.share({
      message: publicUrl,
      url: publicUrl
    });
  }

  async function syncLatestContent() {
    if (!currentCreator?.id || session?.mode === "demo" || !isAtribeBackendConfigured) {
      Alert.alert("Sync latest content", "Backend content sync is not available in this build.");
      return;
    }

    setIsSyncing(true);
    try {
      const { data } = await supabase.auth.getSession();
      const payload = await syncCreatorBioContent({
        creatorId: currentCreator.id,
        accessToken: data.session?.access_token
      });
      await loadBioPage();
      const syncedCount = (payload.results || []).filter((result) => result.status === "synced").length;
      Alert.alert("Sync complete", `${syncedCount} connected platform${syncedCount === 1 ? "" : "s"} synced.`);
    } catch (syncError) {
      Alert.alert("Sync latest content", syncError.message || "Could not sync latest content.");
    } finally {
      setIsSyncing(false);
    }
  }

  function openPreview() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(publicUrl, "_blank", "noopener,noreferrer");
      return;
    }
    Linking.openURL(publicUrl);
  }

  return (
    <AppShell navigation={navigation} activeRoute="CreatorDashboard">
      <SectionHeader
        eyebrow="Creator profile"
        title="Link in Bio"
        body="Create a living profile page that updates with your latest content."
      />

      <View style={styles.layout}>
        <View style={styles.mainColumn}>
          <Card style={styles.previewCard}>
            <Kicker>Public page</Kicker>
            <Text style={styles.cardTitle}>{currentCreator?.name || "Your creator page"}</Text>
            <BodyText>{bioPage?.bio || currentCreator?.bio || "Add a short bio during creator setup."}</BodyText>
            <View style={styles.urlBox}>
              <Text numberOfLines={2} style={styles.urlText}>{publicUrl}</Text>
            </View>
            <View style={styles.actionRow}>
              <PrimaryButton compact label="Preview" onPress={openPreview} />
              <SecondaryButton compact label="Copy URL" onPress={copyPublicUrl} />
              <SecondaryButton compact label="Share" onPress={sharePublicUrl} />
              <SecondaryButton compact label={isSyncing ? "Syncing..." : "Sync latest"} onPress={syncLatestContent} />
            </View>
          </Card>

          <Card style={styles.card}>
            <Kicker>Connected sources</Kicker>
            <Text style={styles.sectionTitle}>Show latest content from</Text>
            {isLoading ? <BodyText>Loading platforms...</BodyText> : null}
            {error ? <BodyText style={styles.errorText}>{error}</BodyText> : null}
            <View style={styles.list}>
              {(creatorSocialAccounts || []).map((account) => {
                const isEnabled = includedAccountIds.has(account.id);
                const platformLabel = platformNames[account.platform] || account.platform;
                return (
                  <View key={account.id} style={styles.sourceRow}>
                    <View style={styles.sourceCopy}>
                      <Text style={styles.sourceTitle}>{platformLabel}</Text>
                      <Text style={styles.sourceMeta}>
                        {account.provider_username || account.username} · {getAccountStatus(account)}
                      </Text>
                    </View>
                    <Pressable
                      disabled={isSaving}
                      onPress={() => togglePlatform(account)}
                      style={[styles.toggle, isEnabled && styles.toggleActive]}
                    >
                      <View style={[styles.toggleKnob, isEnabled && styles.toggleKnobActive]} />
                    </Pressable>
                  </View>
                );
              })}
              {!creatorSocialAccounts?.length && !isLoading ? (
                <BodyText>Connect social accounts first, then choose which ones appear here.</BodyText>
              ) : null}
            </View>
          </Card>
        </View>

        <View style={styles.sideColumn}>
          <Card style={styles.card}>
            <Kicker>Manual links</Kicker>
            <Text style={styles.sectionTitle}>More links</Text>
            <BodyText>Add newsletters, Discord, stores, Patreon, or unsupported social platforms.</BodyText>
            <InputField
              label="Label"
              placeholder="Newsletter"
              value={label}
              onChangeText={setLabel}
            />
            <InputField
              label="URL"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://example.com"
              value={url}
              onChangeText={setUrl}
            />
            <PrimaryButton compact label={isSaving ? "Saving..." : "Add link"} onPress={addManualLink} />
            <View style={styles.list}>
              {manualLinks.map((link) => (
                <Pressable key={link.id} onPress={() => toggleManualLink(link)} style={styles.manualLinkRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.manualLinkTitle}>{link.label}</Text>
                    <Text numberOfLines={1} style={styles.sourceMeta}>{link.url}</Text>
                  </View>
                  <Text style={[styles.enabledText, !link.is_enabled && styles.disabledText]}>
                    {link.is_enabled ? "On" : "Off"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </View>
      </View>
    </AppShell>
  );
}

const styles = {
  layout: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.lg
  },
  mainColumn: {
    flex: 1,
    minWidth: 320,
    gap: theme.spacing.md
  },
  sideColumn: {
    width: 360,
    maxWidth: "100%",
    gap: theme.spacing.md
  },
  card: {
    gap: theme.spacing.md
  },
  previewCard: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.accentBorder
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 34,
    lineHeight: 40
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    lineHeight: 30
  },
  urlBox: {
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: 10,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface
  },
  urlText: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 14
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  list: {
    gap: theme.spacing.sm
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: 10,
    padding: theme.spacing.md
  },
  sourceCopy: {
    flex: 1,
    gap: 4
  },
  sourceTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 16,
    fontWeight: "700"
  },
  sourceMeta: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 13
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 3,
    backgroundColor: theme.colors.surface
  },
  toggleActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentSoft
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.textMuted
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
    backgroundColor: theme.colors.bgPrimary
  },
  manualLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: theme.spacing.sm
  },
  manualLinkTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: "700"
  },
  enabledText: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: "700"
  },
  disabledText: {
    color: theme.colors.textMuted
  },
  errorText: {
    color: theme.colors.errorText
  }
};
