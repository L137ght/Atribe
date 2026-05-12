import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { sampleCreators } from "../data";
import {
  DEFAULT_THEME_ID,
  getBrowserLanguagePreferences,
  getSupportedCountries,
  getSupportedLanguages,
  getThemeLocaleConfig,
  getTranslations,
  resolveThemeLocale,
  translate
} from "../locale";
import { extractTag, getDomainFromUrl } from "../utils";
import {
  clearSessionStorage,
  loadAppState,
  loadCreators,
  loadLocaleSelection,
  loadPreferences,
  loadSession,
  loadSocialAccounts,
  saveAppState,
  saveCreators,
  saveLocaleSelection,
  savePreferences,
  saveSession,
  saveSocialAccounts
} from "../utils";
import { getNextTutorialStep, getTutorialStep } from "../utils";
import {
  backendJson,
  isAtribeBackendConfigured,
  isShopifyShopDomain,
  normalizeShopifyShopDomain,
  isSupabaseConfigured,
  supabase
} from "../lib";

const AppContext = createContext(null);
const DEMO_SUPPORTER_ID = "demo-supporter-user";
const DEMO_CREATOR_ID = "demo-creator-user";
const DEMO_CREATOR_PROFILE_ID = "demo-creator-profile";
const DEFAULT_THEME_CONFIG = getThemeLocaleConfig(DEFAULT_THEME_ID);

const DEMO_SESSIONS = {
  supporter: {
    id: DEMO_SUPPORTER_ID,
    name: "Atribe Supporter Demo",
    email: "supporter@atribe.app",
    photoUrl: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    mode: "demo"
  },
  creator: {
    id: DEMO_CREATOR_ID,
    name: "Atribe Creator Demo",
    email: "creator@atribe.app",
    photoUrl: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    mode: "demo"
  }
};

function buildDemoCreator() {
  return {
    id: DEMO_CREATOR_PROFILE_ID,
    userId: DEMO_CREATOR_ID,
    name: "Atribe Studio",
    platform: "YouTube",
    niche: "Culture / commerce",
    bio: "A seeded creator workspace for interactive product demos.",
    spotlight: "Demo creator",
    affiliateTag: "atribedemo-20",
    createdByUser: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    links: [
      {
        id: "demo-link-amazon",
        domain: "amazon.in",
        url: "https://www.amazon.in/?tag=atribedemo-20"
      },
      {
        id: "demo-link-canva",
        domain: "canva.com",
        url: "https://www.canva.com/?utm_source=atribe&utm_medium=creator&utm_campaign=demo"
      }
    ]
  };
}

function buildDemoSocialAccounts() {
  return [
    {
      id: "demo-social-youtube",
      creator_profile_id: DEMO_CREATOR_PROFILE_ID,
      platform: "youtube",
      username: "@atribestudio",
      external_account_id: "youtube:@atribestudio",
      status: "connected",
      granted_permissions: ["Profile data", "Audience analytics", "Geography"],
      profile_data: {
        username: "@atribestudio",
        connectedVia: "demo-seed"
      },
      last_connected_at: "2026-01-10T10:00:00.000Z",
      created_at: "2026-01-10T10:00:00.000Z",
      creator_social_audience_snapshots: [
        {
          id: "demo-snapshot-youtube",
          captured_at: "2026-01-10T10:00:00.000Z",
          follower_count: 84200,
          age_breakdown: {
            "18-24": 28,
            "25-34": 41,
            "35-44": 19,
            "45-54": 8,
            "55+": 4
          },
          gender_breakdown: {
            women: 54,
            men: 42,
            non_binary: 4
          },
          location_breakdown: {
            "United States": 37,
            India: 21,
            "United Kingdom": 11,
            Canada: 9,
            Germany: 7,
            Other: 15
          },
          engagement_breakdown: {
            engagementRate: 4.8,
            avgViews: 15156
          },
          raw_payload: {
            source: "demo-seed"
          }
        }
      ]
    },
    {
      id: "demo-social-instagram",
      creator_profile_id: DEMO_CREATOR_PROFILE_ID,
      platform: "instagram",
      username: "@atribestudio",
      external_account_id: "instagram:@atribestudio",
      status: "connected",
      granted_permissions: ["Profile data", "Audience analytics", "Gender breakdown"],
      profile_data: {
        username: "@atribestudio",
        connectedVia: "demo-seed"
      },
      last_connected_at: "2026-01-10T10:00:00.000Z",
      created_at: "2026-01-10T10:00:00.000Z",
      creator_social_audience_snapshots: [
        {
          id: "demo-snapshot-instagram",
          captured_at: "2026-01-10T10:00:00.000Z",
          follower_count: 52600,
          age_breakdown: {
            "18-24": 34,
            "25-34": 38,
            "35-44": 17,
            "45-54": 7,
            "55+": 4
          },
          gender_breakdown: {
            women: 61,
            men: 35,
            non_binary: 4
          },
          location_breakdown: {
            "United States": 29,
            India: 26,
            "United Kingdom": 13,
            Canada: 8,
            Germany: 6,
            Other: 18
          },
          engagement_breakdown: {
            engagementRate: 3.6,
            avgViews: 9468
          },
          raw_payload: {
            source: "demo-seed"
          }
        }
      ]
    }
  ];
}

function isDemoSessionRecord(nextSession) {
  return nextSession?.mode === "demo";
}

function mapCreatorRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.display_name,
    platform: row.platform,
    niche: row.niche || "Independent",
    selectedNiches: Array.isArray(row.selected_niches) ? row.selected_niches : [],
    selectedSubNiches:
      row.selected_sub_niches && typeof row.selected_sub_niches === "object"
        ? row.selected_sub_niches
        : {},
    bio: row.bio || "",
    affiliateTag:
      row.creator_affiliate_links?.find((link) => link.domain.includes("amazon."))?.affiliate_url
        ? extractTag(
            row.creator_affiliate_links.find((link) => link.domain.includes("amazon.")).affiliate_url
          )
        : "",
    links: (row.creator_affiliate_links || [])
      .filter((link) => link.is_active)
      .map((link) => ({
        id: link.id,
        domain: link.domain,
        url: link.affiliate_url
      })),
    createdByUser: false,
    createdAt: row.created_at
  };
}

function mapSession(nextSession, profile) {
  const user = nextSession?.user;

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name:
      profile?.display_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "Atribe member",
    email: user.email || "",
    authProvider: user.app_metadata?.provider || null,
    linkedProviders: (user.identities || []).map((identity) => identity.provider).filter(Boolean),
    photoUrl: profile?.avatar_url || user.user_metadata?.avatar_url || "",
    createdAt: user.created_at
  };
}

function isSchemaCacheTableError(error) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

function normalizeLocaleSelection(candidateLocale) {
  if (!candidateLocale?.countryCode) {
    return null;
  }

  const resolvedLocale = resolveThemeLocale({
    themeConfig: DEFAULT_THEME_CONFIG,
    persistedSelection: {
      countryCode: candidateLocale.countryCode,
      languageTag: candidateLocale.languageTag,
      source: candidateLocale.source || "persisted"
    }
  });

  return {
    countryCode: resolvedLocale.countryCode,
    languageTag: resolvedLocale.languageTag,
    source: candidateLocale.source || resolvedLocale.source,
    themeId: candidateLocale.themeId || DEFAULT_THEME_ID
  };
}

function getProfileLocaleSelection(profile) {
  if (!profile?.country_code || !profile?.language_tag) {
    return null;
  }

  return normalizeLocaleSelection({
    countryCode: profile.country_code,
    languageTag: profile.language_tag,
    source: "profile",
    themeId: profile.theme_id || DEFAULT_THEME_ID
  });
}

function isSameLocale(leftLocale, rightLocale) {
  return (
    leftLocale?.countryCode === rightLocale?.countryCode &&
    leftLocale?.languageTag === rightLocale?.languageTag &&
    (leftLocale?.themeId || DEFAULT_THEME_ID) === (rightLocale?.themeId || DEFAULT_THEME_ID)
  );
}

async function ensureProfile(user, intent) {
  if (!user) {
    return null;
  }

  const payload = {
    id: user.id,
    email: user.email || null,
    display_name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      null,
    avatar_url: user.user_metadata?.avatar_url || null,
    preferred_intent: intent || null
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function loadSupabaseState(userId) {
  const [profileResult, creatorsResult, membershipsResult, requestsResult, socialAccountsResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("creator_profiles")
        .select(
          `
            id,
            user_id,
            display_name,
            platform,
            niche,
            selected_niches,
            selected_sub_niches,
            bio,
            is_public,
            created_at,
            creator_affiliate_links (
              id,
              domain,
              affiliate_url,
              is_active,
              created_at
            )
          `
        )
        .order("created_at", { ascending: true }),
      supabase
        .from("tribe_memberships")
        .select("*")
        .eq("user_id", userId),
      supabase
        .from("domain_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("creator_social_accounts")
        .select(
          `
            *,
            creator_social_audience_snapshots (
              id,
              captured_at,
              follower_count,
              age_breakdown,
              gender_breakdown,
              location_breakdown,
              engagement_breakdown,
              raw_payload
            )
          `
        )
        .order("created_at", { ascending: true })
    ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (creatorsResult.error) {
    throw creatorsResult.error;
  }

  if (membershipsResult.error) {
    throw membershipsResult.error;
  }

  if (requestsResult.error) {
    throw requestsResult.error;
  }

  if (socialAccountsResult.error) {
    throw socialAccountsResult.error;
  }

  const databaseCreators = (creatorsResult.data || []).map(mapCreatorRow);
  const creatorIds = new Set(databaseCreators.map((creator) => creator.id));
  const seededCreators = sampleCreators.filter((creator) => !creatorIds.has(creator.id));

  return {
    creators: [...databaseCreators, ...seededCreators],
    memberships: membershipsResult.data || [],
    profile: profileResult.data || null,
    requests: requestsResult.data || [],
    socialAccounts: socialAccountsResult.data || []
  };
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [creators, setCreators] = useState([...sampleCreators]);
  const [preferences, setPreferences] = useState([]);
  const [creatorSocialAccounts, setCreatorSocialAccounts] = useState([]);
  const [creatorBrandLinks, setCreatorBrandLinks] = useState([]);
  const [brandShopDomain, setBrandShopDomainState] = useState(null);
  const [brandInstallStatus, setBrandInstallStatus] = useState(null);
  const [brandInstallStatusLoading, setBrandInstallStatusLoading] = useState(false);
  const [authMode, setAuthMode] = useState(null);
  const [intent, setIntentState] = useState(null);
  const [creatorOnboardingPending, setCreatorOnboardingPending] = useState(false);
  const [creatorProfileId, setCreatorProfileId] = useState(null);
  const [requestedDomains, setRequestedDomains] = useState([]);
  const [distributionMode, setDistributionModeState] = useState("weighted");
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [tutorialStepId, setTutorialStepId] = useState("home");
  const [locale, setLocaleState] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isConfigured] = useState(isSupabaseConfigured);
  const authModeRef = useRef(authMode);
  const localeRef = useRef(locale);
  const localeThemeConfig = DEFAULT_THEME_CONFIG;
  const availableLocaleCountries = useMemo(
    () => getSupportedCountries(DEFAULT_THEME_ID),
    []
  );
  const localeSelectionRequired = Platform.OS !== "web" && !locale;
  const translations = useMemo(
    () => getTranslations(DEFAULT_THEME_ID, locale?.languageTag || localeThemeConfig.defaultLanguageTag),
    [locale?.languageTag, localeThemeConfig.defaultLanguageTag]
  );

  const currentCreator = useMemo(
    () => creators.find((creator) => creator.id === creatorProfileId) || null,
    [creatorProfileId, creators]
  );
  const isDemoSession = authMode === "demo" || isDemoSessionRecord(session);

  useEffect(() => {
    authModeRef.current = authMode;
  }, [authMode]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  async function persistAppState(overrides = {}) {
    await saveAppState({
      brandShopDomain,
      creatorProfileId,
      creatorOnboardingPending,
      intent,
      requestedDomains,
      distributionMode,
      tutorialActive,
      tutorialCompleted,
      tutorialStepId,
      ...overrides
    });
  }

  async function persistDemoCollections({
    nextCreators = creators,
    nextPreferences = preferences,
    nextSocialAccounts = creatorSocialAccounts,
    nextSession = session
  } = {}) {
    await Promise.all([
      saveSession(nextSession),
      saveCreators(nextCreators),
      savePreferences(nextPreferences),
      saveSocialAccounts(nextSocialAccounts)
    ]);
  }

  async function persistResolvedLocale(nextLocale, syncProfile = false) {
    const normalizedLocale = normalizeLocaleSelection(nextLocale);

    if (!normalizedLocale) {
      return null;
    }

    setLocaleState(normalizedLocale);
    await saveLocaleSelection(normalizedLocale);

    if (
      syncProfile &&
      !isDemoSession &&
      isConfigured &&
      session?.id
    ) {
      const { error } = await supabase
        .from("profiles")
        .update({
          country_code: normalizedLocale.countryCode,
          language_tag: normalizedLocale.languageTag,
          theme_id: normalizedLocale.themeId
        })
        .eq("id", session.id);

      if (error) {
        throw error;
      }
    }

    return normalizedLocale;
  }

  async function setLocaleSelection(selection) {
    return persistResolvedLocale(
      {
        ...selection,
        source: "explicit",
        themeId: DEFAULT_THEME_ID
      },
      true
    );
  }

  function getAvailableLocaleLanguages(countryCode) {
    return getSupportedLanguages(DEFAULT_THEME_ID, countryCode);
  }

  const t = useCallback(
    (keyPath, fallbackValue = keyPath) => translate(translations, keyPath, fallbackValue),
    [translations]
  );

  async function hydrateDemoState(nextSession, persistedAppState) {
    setCreatorBrandLinks([]);
    setBrandShopDomainState(null);
    setBrandInstallStatus(null);
    setBrandInstallStatusLoading(false);
    const hasPersistedCreatorProfileId = Object.prototype.hasOwnProperty.call(
      persistedAppState || {},
      "creatorProfileId"
    );
    const nextCreatorProfileId =
      hasPersistedCreatorProfileId
        ? persistedAppState.creatorProfileId
        : nextSession?.id === DEMO_CREATOR_ID
        ? DEMO_CREATOR_PROFILE_ID
        : null;
    const storedCreators = await loadCreators();
    const storedPreferences = await loadPreferences();
    const storedSocialAccounts = await loadSocialAccounts();
    const demoCreator =
      storedCreators.find((creator) => creator.id === DEMO_CREATOR_PROFILE_ID) || buildDemoCreator();
    const baseCreators = [
      demoCreator,
      ...sampleCreators.filter((creator) => creator.id !== DEMO_CREATOR_PROFILE_ID)
    ];
    const nextCreators =
      nextSession?.id === DEMO_CREATOR_ID ? baseCreators : sampleCreators;
    const nextPreferences =
      storedPreferences.length
        ? storedPreferences
        : nextSession?.id === DEMO_SUPPORTER_ID
        ? [
            {
              id: "demo-pref-julian",
              creatorId: "seed-julian-vane",
              userId: DEMO_SUPPORTER_ID,
              weight: 50,
              selected: true
            },
            {
              id: "demo-pref-anya",
              creatorId: "seed-anya-roe",
              userId: DEMO_SUPPORTER_ID,
              weight: 30,
              selected: true
            },
            {
              id: "demo-pref-priya",
              creatorId: "seed-priya-sol",
              userId: DEMO_SUPPORTER_ID,
              weight: 20,
              selected: true
            }
          ]
        : [];
    const nextSocialAccounts =
      nextSession?.id === DEMO_CREATOR_ID
        ? nextCreatorProfileId
          ? storedSocialAccounts.length
            ? storedSocialAccounts
            : buildDemoSocialAccounts()
          : []
        : [];

    setAuthMode("demo");
    setSession(nextSession);
    setCreators(nextCreators);
    setPreferences(nextPreferences);
    setCreatorSocialAccounts(nextSocialAccounts);
    setIntentState(persistedAppState.intent || (nextSession?.id === DEMO_CREATOR_ID ? "creator" : "supporter"));
    setCreatorOnboardingPending(Boolean(persistedAppState.creatorOnboardingPending));
    setCreatorProfileId(nextCreatorProfileId);
    setRequestedDomains(persistedAppState.requestedDomains || []);
    setDistributionModeState(persistedAppState.distributionMode || "weighted");
    setTutorialActive(Boolean(persistedAppState.tutorialActive));
    setTutorialCompleted(Boolean(persistedAppState.tutorialCompleted));
    setTutorialStepId(persistedAppState.tutorialStepId || "home");

    await Promise.all([
      saveSession(nextSession),
      saveCreators(nextCreators),
      savePreferences(nextPreferences),
      saveSocialAccounts(nextSocialAccounts)
    ]);
  }

  async function fetchBrandInstallStatus({ shopDomain, accessToken }) {
    const normalizedShopDomain = normalizeShopifyShopDomain(shopDomain);

    if (!normalizedShopDomain) {
      throw new Error("Enter a valid Shopify store domain, like your-store.myshopify.com.");
    }

    if (!accessToken || !isAtribeBackendConfigured) {
      return null;
    }

    const payload = await backendJson(
      `/brand/shopify/install-status?shop_domain=${encodeURIComponent(normalizedShopDomain)}`,
      {
        accessToken
      }
    );

    return payload?.install_status || payload;
  }

  async function refreshAppState(nextSession, preferredIntent, forceIntentSelection = false) {
    const persistedAppState = await loadAppState();
    const shouldForceIntentSelection =
      forceIntentSelection || Boolean(persistedAppState.forceIntentSelection);

    if (isDemoSessionRecord(nextSession)) {
      await hydrateDemoState(nextSession, persistedAppState);
      return;
    }

    if (!nextSession?.user || !isConfigured) {
      setAuthMode(null);
      setSession(null);
      setCreators([...sampleCreators]);
      setPreferences([]);
      setCreatorSocialAccounts([]);
      setCreatorBrandLinks([]);
      setBrandShopDomainState(null);
      setBrandInstallStatus(null);
      setBrandInstallStatusLoading(false);
      setIntentState(null);
      setCreatorOnboardingPending(false);
      setCreatorProfileId(null);
      setRequestedDomains([]);
      setDistributionModeState(persistedAppState.distributionMode || "weighted");
      setTutorialActive(Boolean(persistedAppState.tutorialActive));
      setTutorialCompleted(Boolean(persistedAppState.tutorialCompleted));
      setTutorialStepId(persistedAppState.tutorialStepId || "home");
      return;
    }

    let profile;
    let appState;
    let nextCreatorBrandLinks = [];
    let nextBrandShopDomain = normalizeShopifyShopDomain(persistedAppState.brandShopDomain);
    let nextBrandInstallStatus = null;

    try {
      profile = await ensureProfile(nextSession.user, preferredIntent);
      appState = await loadSupabaseState(nextSession.user.id);
    } catch (error) {
      if (!isSchemaCacheTableError(error)) {
        throw error;
      }

      console.warn(
        "Supabase profile tables are unavailable; continuing with auth-only fallback.",
        error
      );

      const fallbackSession = mapSession(nextSession, null);

      setAuthMode("supabase");
      setSession(fallbackSession);
      setCreators([...sampleCreators]);
      setPreferences([]);
      setIntentState(null);
      setCreatorOnboardingPending(false);
      setCreatorProfileId(null);
      setRequestedDomains([]);
      setCreatorSocialAccounts([]);
      setCreatorBrandLinks([]);
      setBrandShopDomainState(null);
      setBrandInstallStatus(null);
      setBrandInstallStatusLoading(false);
      setDistributionModeState(persistedAppState.distributionMode || "weighted");
      setTutorialActive(Boolean(persistedAppState.tutorialActive));
      setTutorialCompleted(Boolean(persistedAppState.tutorialCompleted));
      setTutorialStepId(persistedAppState.tutorialStepId || "home");

      await saveAppState({
        ...persistedAppState,
        forceIntentSelection: false,
        intent: null
      });

      return;
    }

    const activeIntent = shouldForceIntentSelection
      ? null
      : preferredIntent || appState.profile?.preferred_intent || profile?.preferred_intent || null;
    const profileLocale = getProfileLocaleSelection(profile || appState.profile);
    const nextSessionState = mapSession(nextSession, profile || appState.profile);
    const ownCreator = appState.creators.find((creator) => creator.userId === nextSession.user.id);

    if (ownCreator?.id && nextSession.access_token && isAtribeBackendConfigured) {
      try {
        const payload = await backendJson(
          `/creator/brands?creator_id=${encodeURIComponent(ownCreator.id)}`,
          {
            accessToken: nextSession.access_token
          }
        );
        nextCreatorBrandLinks = payload.brands || [];
      } catch (error) {
        console.warn("Failed to load creator brand links from backend", error);
      }
    }

    if (activeIntent === "brand" && nextBrandShopDomain && nextSession.access_token && isAtribeBackendConfigured) {
      setBrandInstallStatusLoading(true);
      try {
        nextBrandInstallStatus = await fetchBrandInstallStatus({
          shopDomain: nextBrandShopDomain,
          accessToken: nextSession.access_token
        });
        nextBrandShopDomain = normalizeShopifyShopDomain(
          nextBrandInstallStatus?.shop_domain || nextBrandShopDomain
        );
      } catch (error) {
        console.warn("Failed to load brand install status from backend", error);
      } finally {
        setBrandInstallStatusLoading(false);
      }
    } else {
      setBrandInstallStatusLoading(false);
    }

    setAuthMode("supabase");
    setSession(nextSessionState);
    setCreators(appState.creators);
    setPreferences(
      appState.memberships.map((membership) => ({
        id: membership.id,
        creatorId: membership.creator_profile_id,
        userId: membership.user_id,
        weight: membership.weight,
        selected: membership.selected
      }))
    );
    setIntentState(activeIntent);
    setCreatorOnboardingPending(
      activeIntent === "creator" ? Boolean(persistedAppState.creatorOnboardingPending) : false
    );
    setCreatorProfileId(ownCreator?.id || null);
    setRequestedDomains(appState.requests.map((request) => request.domain));
    setCreatorSocialAccounts(
      (appState.socialAccounts || []).filter(
        (account) => account.creator_profile_id === ownCreator?.id
      )
    );
    setCreatorBrandLinks(nextCreatorBrandLinks);
    setBrandShopDomainState(activeIntent === "brand" ? nextBrandShopDomain : null);
    setBrandInstallStatus(activeIntent === "brand" ? nextBrandInstallStatus : null);
    setDistributionModeState(persistedAppState.distributionMode || "weighted");
    setTutorialActive(Boolean(persistedAppState.tutorialActive));
    setTutorialCompleted(Boolean(persistedAppState.tutorialCompleted));
    setTutorialStepId(persistedAppState.tutorialStepId || "home");

    const currentLocale = localeRef.current;
    const shouldAdoptProfileLocale =
      profileLocale &&
      (!currentLocale || currentLocale.source !== "explicit");

    if (shouldAdoptProfileLocale) {
      await persistResolvedLocale({
        ...profileLocale,
        source: "profile"
      });
    } else if (currentLocale && (!profileLocale || currentLocale.source === "explicit")) {
      await supabase
        .from("profiles")
        .update({
          country_code: currentLocale.countryCode,
          language_tag: currentLocale.languageTag,
          theme_id: currentLocale.themeId || DEFAULT_THEME_ID
        })
        .eq("id", nextSession.user.id);
    }

    if (persistedAppState.forceIntentSelection) {
      await saveAppState({
        ...persistedAppState,
        brandShopDomain: activeIntent === "brand" ? nextBrandShopDomain : null,
        forceIntentSelection: false,
        intent: null
      });
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const persistedAppState = await loadAppState();
        const persistedSession = await loadSession();
        const persistedLocale = normalizeLocaleSelection(await loadLocaleSelection());
        const browserResolvedLocale =
          Platform.OS === "web"
            ? normalizeLocaleSelection(
                resolveThemeLocale({
                  themeConfig: localeThemeConfig,
                  browserLanguages: getBrowserLanguagePreferences()
                })
              )
            : null;
        const initialLocale = persistedLocale || browserResolvedLocale;

        if (!isMounted) {
          return;
        }

        if (initialLocale) {
          setLocaleState(initialLocale);
          if (!persistedLocale) {
            await saveLocaleSelection(initialLocale);
          }
        }

        setDistributionModeState(persistedAppState.distributionMode || "weighted");
        setTutorialActive(Boolean(persistedAppState.tutorialActive));
        setTutorialCompleted(Boolean(persistedAppState.tutorialCompleted));
        setTutorialStepId(persistedAppState.tutorialStepId || "home");

        if (isDemoSessionRecord(persistedSession)) {
          await hydrateDemoState(persistedSession, persistedAppState);
          return;
        }

        if (!isConfigured) {
          return;
        }

        // Do not block the initial navigator on a potentially slow auth lock recovery.
        void supabase.auth
          .getSession()
          .then(async ({ data }) => {
            if (!isMounted) {
              return;
            }

            if (data.session) {
              await refreshAppState(data.session);
            }
          })
          .catch((error) => {
            console.error("Failed to restore Supabase session", error);
          });
      } catch (error) {
        console.error("Failed to bootstrap Supabase state", error);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    bootstrap();

    if (!isConfigured) {
      setIsReady(true);
      return () => {
        isMounted = false;
      };
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) {
        return;
      }

      if (authModeRef.current === "demo" && !nextSession) {
        return;
      }

      try {
        const hasPendingSocialOAuth =
          typeof window !== "undefined" &&
          Boolean(window.localStorage?.getItem("atribe.pending-social-oauth"));
        const skipIntentSelectionOnce =
          typeof window !== "undefined" &&
          Boolean(window.localStorage?.getItem("atribe.skip-intent-selection-once"));
        const isOnboardingPath =
          typeof window !== "undefined" &&
          (window.location?.pathname?.startsWith("/creator/onboarding") ||
            window.location?.pathname?.startsWith("/creator/socials/connect"));
        if (skipIntentSelectionOnce && typeof window !== "undefined") {
          window.localStorage?.removeItem("atribe.skip-intent-selection-once");
        }
        const shouldForceIntentSelection =
          event === "SIGNED_IN" &&
          !hasPendingSocialOAuth &&
          !skipIntentSelectionOnce &&
          !isOnboardingPath;
        await refreshAppState(nextSession, undefined, shouldForceIntentSelection);
      } catch (error) {
        console.error("Failed to refresh Supabase auth state", error);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  useEffect(() => {
    if (!session?.id || !intent || intent === "creator" || tutorialCompleted || tutorialActive) {
      return;
    }

    setTutorialActive(true);
    setTutorialStepId("home");

    persistAppState({
      tutorialActive: true,
      tutorialCompleted: false,
      tutorialStepId: "home"
    }).catch((error) => {
      console.error("Failed to persist tutorial state", error);
    });
  }, [intent, session?.id, tutorialActive, tutorialCompleted]);

  function getPreference(creatorId) {
    return preferences.find((preference) => preference.creatorId === creatorId);
  }

  async function signInWithGoogle({ accessToken, idToken, nonce }) {
    if (!isConfigured) {
      throw new Error("Supabase is not configured. Add your project URL and publishable key first.");
    }

    if (!idToken) {
      throw new Error("Google did not return an ID token.");
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      accessToken,
      nonce
    });

    if (error) {
      throw error;
    }

    setAuthMode("supabase");
    await refreshAppState(data.session, undefined, true);
  }

  async function signInWithGoogleOAuth({ redirectTo } = {}) {
    if (!isConfigured) {
      throw new Error("Supabase is not configured. Add your project URL and publishable key first.");
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true
      }
    });

    if (error) {
      throw error;
    }

    if (typeof window !== "undefined") {
      if (!data?.url) {
        throw new Error("Google OAuth URL was not returned by Supabase.");
      }

      window.location.assign(data.url);
    }
  }

  async function signInWithPassword({ email, password }) {
    if (!isConfigured) {
      throw new Error("Supabase is not configured. Add your project URL and publishable key first.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    setAuthMode("supabase");
    await refreshAppState(data.session, undefined, true);
  }

  async function signInAsDemo(role = "supporter") {
    const normalizedRole = role === "creator" ? "creator" : "supporter";
    const persistedAppState = await loadAppState();
    const nextCreatorProfileId =
      normalizedRole === "creator" ? persistedAppState.creatorProfileId ?? null : null;
    const nextSession = DEMO_SESSIONS[normalizedRole];

    await hydrateDemoState(nextSession, {
      ...persistedAppState,
      intent: normalizedRole,
      creatorProfileId: nextCreatorProfileId
    });

    await persistAppState({
      ...persistedAppState,
      intent: normalizedRole,
      creatorProfileId: nextCreatorProfileId
    });
  }

  async function signOut() {
    if (isDemoSession) {
      setAuthMode(null);
      setSession(null);
      setCreators([...sampleCreators]);
      setPreferences([]);
      setCreatorSocialAccounts([]);
      setCreatorBrandLinks([]);
      setBrandShopDomainState(null);
      setBrandInstallStatus(null);
      setBrandInstallStatusLoading(false);
      setIntentState(null);
      setCreatorOnboardingPending(false);
      setCreatorProfileId(null);
      setRequestedDomains([]);
      await clearSessionStorage();
      await persistAppState({
        brandShopDomain: null,
        creatorProfileId: null,
        intent: null,
        creatorOnboardingPending: false,
        requestedDomains: [],
        distributionMode,
        tutorialActive: false,
        tutorialCompleted,
        tutorialStepId: "home"
      });
      return;
    }

    if (!isConfigured) {
      setSession(null);
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }

  async function setIntent(nextIntent) {
    const needsOnboarding = nextIntent === "creator";

    if (isDemoSession) {
      setIntentState(nextIntent);
      setCreatorOnboardingPending(needsOnboarding);
      await persistAppState({
        intent: nextIntent,
        creatorOnboardingPending: needsOnboarding
      });
      return;
    }

    if (!session?.id || !isConfigured) {
      setIntentState(nextIntent);
      setCreatorOnboardingPending(needsOnboarding);
      await persistAppState({
        intent: nextIntent,
        creatorOnboardingPending: needsOnboarding
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ preferred_intent: nextIntent })
      .eq("id", session.id);

    if (error) {
      throw error;
    }

    setIntentState(nextIntent);
    setCreatorOnboardingPending(needsOnboarding);
    await persistAppState({
      intent: nextIntent,
      creatorOnboardingPending: needsOnboarding
    });
  }

  async function setBrandShopDomain(nextShopDomainInput) {
    const nextShopDomain = nextShopDomainInput
      ? normalizeShopifyShopDomain(nextShopDomainInput)
      : null;

    if (nextShopDomainInput && !nextShopDomain) {
      throw new Error("Enter a valid Shopify store domain, like your-store.myshopify.com.");
    }

    setBrandShopDomainState(nextShopDomain);
    if (!nextShopDomain) {
      setBrandInstallStatus(null);
    }

    await persistAppState({
      brandShopDomain: nextShopDomain
    });

    return nextShopDomain;
  }

  async function refreshBrandInstallStatus(shopDomainInput = null) {
    const requestedShopDomain =
      normalizeShopifyShopDomain(shopDomainInput) || brandShopDomain;

    if (!requestedShopDomain) {
      setBrandInstallStatus(null);
      return null;
    }

    if (!isConfigured) {
      throw new Error("You need to be signed in before checking Shopify install status.");
    }

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error("You need to be signed in before checking Shopify install status.");
    }

    setBrandInstallStatusLoading(true);
    try {
      const payload = await fetchBrandInstallStatus({
        shopDomain: requestedShopDomain,
        accessToken
      });
      const resolvedShopDomain = normalizeShopifyShopDomain(
        payload?.shop_domain || requestedShopDomain
      );

      setBrandShopDomainState(resolvedShopDomain);
      setBrandInstallStatus(payload);
      await persistAppState({
        brandShopDomain: resolvedShopDomain
      });

      return payload;
    } finally {
      setBrandInstallStatusLoading(false);
    }
  }

  async function createBrandCampaign({
    brandId = null,
    name,
    shopperOfferType,
    shopperOfferValue,
    commissionRate,
    duration
  }) {
    const shopDomain = brandInstallStatus?.shop_domain || brandShopDomain;

    if (!shopDomain) {
      throw new Error("Connect your Shopify store before creating a campaign.");
    }

    if (!isConfigured) {
      throw new Error("You need to be signed in before creating a campaign.");
    }

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error("You need to be signed in before creating a campaign.");
    }

    const payload = await backendJson("/brand/campaigns", {
      method: "POST",
      accessToken,
      body: {
        brand_id: brandId,
        shop_domain: shopDomain,
        name,
        shopper_offer_type: shopperOfferType,
        shopper_offer_value: shopperOfferValue,
        commission_rate: commissionRate,
        duration
      }
    });

    await refreshBrandInstallStatus(shopDomain);
    return payload;
  }

  async function setDistributionMode(nextMode) {
    const normalizedMode = nextMode === "even" ? "even" : "weighted";

    setDistributionModeState(normalizedMode);
    await persistAppState({ distributionMode: normalizedMode });
  }

  async function startTutorial(stepId = "home") {
    const nextStepId = getTutorialStep(stepId)?.id || "home";

    setTutorialActive(true);
    setTutorialCompleted(false);
    setTutorialStepId(nextStepId);
    await persistAppState({
      tutorialActive: true,
      tutorialCompleted: false,
      tutorialStepId: nextStepId
    });
  }

  async function advanceTutorial() {
    const nextStep = getNextTutorialStep(tutorialStepId);

    if (!nextStep) {
      setTutorialActive(false);
      setTutorialCompleted(true);
      await persistAppState({
        tutorialActive: false,
        tutorialCompleted: true,
        tutorialStepId
      });
      return null;
    }

    setTutorialActive(true);
    setTutorialStepId(nextStep.id);
    await persistAppState({
      tutorialActive: true,
      tutorialCompleted: false,
      tutorialStepId: nextStep.id
    });

    return nextStep;
  }

  async function skipTutorial() {
    setTutorialActive(false);
    setTutorialCompleted(true);
    await persistAppState({
      tutorialActive: false,
      tutorialCompleted: true,
      tutorialStepId
    });
  }

  async function completeCreatorOnboarding({ name, platform, niche, selectedNiches, selectedSubNiches }) {
    if (isDemoSession) {
      if (!name.trim()) {
        throw new Error("Enter a creator name.");
      }

      if (!platform.trim()) {
        throw new Error("Select a primary platform.");
      }

      const isFirstCreatorProfile = !currentCreator;
      const nextCreator = {
        ...(currentCreator || {}),
        id: DEMO_CREATOR_PROFILE_ID,
        userId: DEMO_CREATOR_ID,
        name: name.trim(),
        platform: platform.trim(),
        niche: niche?.trim() || currentCreator?.niche || "Independent",
        selectedNiches: Array.isArray(selectedNiches) ? selectedNiches : currentCreator?.selectedNiches || [],
        selectedSubNiches:
          selectedSubNiches && typeof selectedSubNiches === "object"
            ? selectedSubNiches
            : currentCreator?.selectedSubNiches || {},
        bio: currentCreator?.bio || "Atribe creator profile.",
        affiliateTag: currentCreator?.affiliateTag || "",
        spotlight: currentCreator?.spotlight || "Demo creator",
        links: isFirstCreatorProfile ? [] : currentCreator?.links || [],
        createdByUser: true
      };
      const nextCreators = [
        nextCreator,
        ...creators.filter((creator) => creator.id !== DEMO_CREATOR_PROFILE_ID)
      ];

      setCreators(nextCreators);
      setCreatorProfileId(nextCreator.id);
      setIntentState("creator");
      setCreatorOnboardingPending(false);
      await persistDemoCollections({ nextCreators });
      await persistAppState({
        creatorProfileId: nextCreator.id,
        intent: "creator",
        creatorOnboardingPending: false
      });
      return;
    }

    if (!session?.id || !isConfigured) {
      throw new Error("You need to be signed in to continue.");
    }

    if (!name.trim()) {
      throw new Error("Enter a creator name.");
    }

    if (!platform.trim()) {
      throw new Error("Select a primary platform.");
    }

    const payload = {
      user_id: session.id,
      display_name: name.trim(),
      platform: platform.trim(),
      niche: niche?.trim() || currentCreator?.niche || "Independent",
      selected_niches: Array.isArray(selectedNiches) ? selectedNiches : currentCreator?.selectedNiches || [],
      selected_sub_niches:
        selectedSubNiches && typeof selectedSubNiches === "object"
          ? selectedSubNiches
          : currentCreator?.selectedSubNiches || {},
      bio: currentCreator?.bio || "Atribe creator profile.",
      is_public: true
    };

    let result;

    if (currentCreator) {
      result = await supabase
        .from("creator_profiles")
        .update(payload)
        .eq("id", currentCreator.id)
        .select("id")
        .single();
    } else {
      result = await supabase
        .from("creator_profiles")
        .insert(payload)
        .select("id")
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    await supabase
      .from("profiles")
      .update({
        display_name: name.trim(),
        preferred_intent: "creator"
      })
      .eq("id", session.id);

    await refreshAppState(await supabase.auth.getSession().then(({ data }) => data.session), "creator");
    setCreatorOnboardingPending(false);
    await persistAppState({
      creatorOnboardingPending: false
    });
  }

  function buildAudienceSnapshot(platform) {
    const baselineFollowers = {
      youtube: 84200,
      instagram: 52600,
      tiktok: 118000,
      x: 19400,
      facebook: 16100,
      github: 9300,
      linkedin: 12800,
      twitch: 22100
    };
    const followerCount = baselineFollowers[platform] || 10000;

    return {
      follower_count: followerCount,
      age_breakdown: {
        "18-24": 28,
        "25-34": 41,
        "35-44": 19,
        "45-54": 8,
        "55+": 4
      },
      gender_breakdown: {
        women: 54,
        men: 42,
        non_binary: 4
      },
      location_breakdown: {
        "United States": 37,
        India: 21,
        "United Kingdom": 11,
        Canada: 9,
        Germany: 7,
        Other: 15
      },
      engagement_breakdown: {
        engagementRate: platform === "youtube" ? 4.8 : 3.6,
        avgViews: Math.round(followerCount * 0.18)
      },
      raw_payload: {
        source: "oauth-modal-prototype"
      }
    };
  }

  async function connectSocialAccount({
    platform,
    username,
    password,
    permissions,
    oauthProvider
  }) {
    if (isDemoSession) {
      if (!currentCreator) {
        throw new Error("Finish creator onboarding first.");
      }

      if (!username?.trim()) {
        throw new Error("Enter your login credentials to continue.");
      }

      if (!oauthProvider && !password?.trim()) {
        throw new Error("Enter your login credentials to continue.");
      }

      if (!oauthProvider && password.trim().length < 6) {
        throw new Error("Connection failed. Please try again later.");
      }

      const nextAccount = {
        id: `demo-social-${platform}`,
        creator_profile_id: currentCreator.id,
        platform,
        username: username.trim(),
        external_account_id: `${platform}:${username.trim().toLowerCase()}`,
        provider_account_id: `${platform}:${username.trim().toLowerCase()}`,
        provider_username: username.trim(),
        provider_display_name: username.trim(),
        provider_avatar_url: "",
        status: "connected",
        granted_permissions: permissions || [],
        granted_scopes: permissions || [],
        profile_data: {
          username: username.trim(),
          connectedVia: oauthProvider ? "oauth-provider" : "oauth-modal",
          oauthProvider: oauthProvider || null
        },
        token_expires_at: null,
        last_synced_at: null,
        last_connected_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        creator_social_audience_snapshots: [
          {
            id: `demo-snapshot-${platform}-${Date.now()}`,
            captured_at: new Date().toISOString(),
            ...buildAudienceSnapshot(platform)
          }
        ]
      };

      const nextSocialAccounts = creatorSocialAccounts.some((account) => account.platform === platform)
        ? creatorSocialAccounts.map((account) =>
            account.platform === platform ? nextAccount : account
          )
        : [...creatorSocialAccounts, nextAccount];

      setCreatorSocialAccounts(nextSocialAccounts);
      await persistDemoCollections({ nextSocialAccounts });
      return nextAccount;
    }

    if (!currentCreator || !isConfigured) {
      throw new Error("Finish creator onboarding first.");
    }

    if (!username?.trim()) {
      throw new Error("Enter your login credentials to continue.");
    }

    if (!oauthProvider && !password?.trim()) {
      throw new Error("Enter your login credentials to continue.");
    }

    if (!oauthProvider && password.trim().length < 6) {
      throw new Error("Connection failed. Please try again later.");
    }

    const socialPayload = {
      creator_profile_id: currentCreator.id,
      platform,
      username: username.trim(),
      external_account_id: `${platform}:${username.trim().toLowerCase()}`,
      provider_account_id: `${platform}:${username.trim().toLowerCase()}`,
      provider_username: username.trim(),
      provider_display_name: username.trim(),
      provider_avatar_url: "",
      status: "connected",
      granted_permissions: permissions || [],
      granted_scopes: permissions || [],
      profile_data: {
        username: username.trim(),
        connectedVia: oauthProvider ? "oauth-provider" : "oauth-modal",
        oauthProvider: oauthProvider || null
      },
      token_expires_at: null,
      last_synced_at: null,
      last_connected_at: new Date().toISOString()
    };

    const { error: socialError, data: socialData } = await supabase
      .from("creator_social_accounts")
      .upsert(socialPayload, {
        onConflict: "creator_profile_id,platform"
      })
      .select("*")
      .single();

    if (socialError) {
      throw socialError;
    }

    const { error: snapshotError, data: snapshotData } = await supabase
      .from("creator_social_audience_snapshots")
      .insert({
        creator_social_account_id: socialData.id,
        ...buildAudienceSnapshot(platform)
      })
      .select("*")
      .single();

    if (snapshotError) {
      throw snapshotError;
    }

    const mergedAccount = {
      ...socialData,
      creator_social_audience_snapshots: [snapshotData]
    };

    setCreatorSocialAccounts((current) => {
      const exists = current.some((account) => account.platform === platform);

      if (exists) {
        return current.map((account) =>
          account.platform === platform ? mergedAccount : account
        );
      }

      return [...current, mergedAccount];
    });

    return mergedAccount;
  }

  async function addAffiliateLink(url) {
    if (isDemoSession) {
      if (!currentCreator) {
        throw new Error("Finish creator onboarding first.");
      }

      const domain = getDomainFromUrl(url);

      if (!domain) {
        throw new Error("Enter a valid affiliate link, including https://");
      }

      const nextLink = {
        id: `demo-link-${domain.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`,
        domain,
        url: url.trim()
      };
      const nextCreator = {
        ...currentCreator,
        links: [
          ...currentCreator.links.filter((link) => link.domain !== domain),
          nextLink
        ]
      };
      const nextCreators = creators.map((creator) =>
        creator.id === currentCreator.id ? nextCreator : creator
      );

      setCreators(nextCreators);
      await persistDemoCollections({ nextCreators });
      return;
    }

    if (!currentCreator || !isConfigured) {
      throw new Error("Finish creator onboarding first.");
    }

    const domain = getDomainFromUrl(url);

    if (!domain) {
      throw new Error("Enter a valid affiliate link, including https://");
    }

    if (isShopifyShopDomain(domain)) {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken || !isAtribeBackendConfigured) {
        throw new Error(
          "Shopify store connections require the Atribe backend URL and a signed-in account."
        );
      }

      const shopDomain = normalizeShopifyShopDomain(url);
      const payload = await backendJson("/creator/brands", {
        method: "POST",
        accessToken,
        body: {
          creator_id: currentCreator.id,
          shop_domain: shopDomain
        }
      });

      setCreatorBrandLinks((current) => {
        const existingIndex = current.findIndex((item) => item.id === payload.brand_link.id);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = payload.brand_link;
          return next;
        }
        return [payload.brand_link, ...current];
      });

      return;
    }

    const { error } = await supabase
      .from("creator_affiliate_links")
      .upsert({
        creator_profile_id: currentCreator.id,
        domain,
        affiliate_url: url.trim(),
        is_active: true
      }, {
        onConflict: "creator_profile_id,domain"
      })
      .select("id");

    if (error) {
      throw error;
    }

    await refreshAppState(await supabase.auth.getSession().then(({ data }) => data.session), intent);
  }

  async function removeAffiliateLink(linkId) {
    if (isDemoSession) {
      if (!currentCreator) {
        return;
      }

      const nextCreator = {
        ...currentCreator,
        links: currentCreator.links.filter((link) => link.id !== linkId)
      };
      const nextCreators = creators.map((creator) =>
        creator.id === currentCreator.id ? nextCreator : creator
      );

      setCreators(nextCreators);
      await persistDemoCollections({ nextCreators });
      return;
    }

    if (!currentCreator || !isConfigured) {
      return;
    }

    const { error } = await supabase
      .from("creator_affiliate_links")
      .delete()
      .eq("id", linkId);

    if (error) {
      throw error;
    }

    await refreshAppState(await supabase.auth.getSession().then(({ data }) => data.session), intent);
  }

  async function createCreatorBrandLink(shopDomainInput) {
    if (!currentCreator) {
      throw new Error("Finish creator onboarding first.");
    }

    if (!isAtribeBackendConfigured) {
      throw new Error("Atribe backend URL is not configured. Set EXPO_PUBLIC_ATRIBE_BACKEND_URL.");
    }

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error("You need to be signed in to connect a Shopify store.");
    }

    const shopDomain = normalizeShopifyShopDomain(shopDomainInput);
    if (!shopDomain) {
      throw new Error("Enter a valid Shopify store domain, like store-name.myshopify.com.");
    }

    const payload = await backendJson("/creator/brands", {
      method: "POST",
      accessToken,
      body: {
        creator_id: currentCreator.id,
        shop_domain: shopDomain
      }
    });

    setCreatorBrandLinks((current) => {
      const existingIndex = current.findIndex((item) => item.id === payload.brand_link.id);
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = payload.brand_link;
        return next;
      }
      return [payload.brand_link, ...current];
    });

    return payload.brand_link;
  }

  async function updateCreatorBrandLinkStatus(id, status) {
    if (!isAtribeBackendConfigured) {
      throw new Error("Atribe backend URL is not configured. Set EXPO_PUBLIC_ATRIBE_BACKEND_URL.");
    }

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error("You need to be signed in to update a Shopify brand connection.");
    }

    const payload = await backendJson(`/creator/brands/${encodeURIComponent(id)}`, {
      method: "PATCH",
      accessToken,
      body: {
        status
      }
    });

    setCreatorBrandLinks((current) =>
      current.map((item) => (item.id === payload.brand_link.id ? payload.brand_link : item))
    );

    return payload.brand_link;
  }

  async function archiveCreatorBrandLink(id) {
    if (!isAtribeBackendConfigured) {
      throw new Error("Atribe backend URL is not configured. Set EXPO_PUBLIC_ATRIBE_BACKEND_URL.");
    }

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error("You need to be signed in to remove a Shopify brand connection.");
    }

    const payload = await backendJson(`/creator/brands/${encodeURIComponent(id)}`, {
      method: "DELETE",
      accessToken
    });

    setCreatorBrandLinks((current) =>
      current.map((item) => (item.id === payload.brand_link.id ? payload.brand_link : item))
    );

    return payload.brand_link;
  }

  async function updatePreference(creatorId, updates) {
    if (isDemoSession) {
      const existingPreference = getPreference(creatorId);
      const mappedPreference = {
        id: existingPreference?.id || `demo-pref-${creatorId}`,
        creatorId,
        userId: session?.id || DEMO_SUPPORTER_ID,
        weight: updates.weight ?? existingPreference?.weight ?? 50,
        selected: updates.selected ?? existingPreference?.selected ?? false
      };
      const nextPreferences = preferences.some((preference) => preference.creatorId === creatorId)
        ? preferences.map((preference) =>
            preference.creatorId === creatorId ? mappedPreference : preference
          )
        : [...preferences, mappedPreference];

      setPreferences(nextPreferences);
      await persistDemoCollections({ nextPreferences });
      return;
    }

    if (!session?.id || !isConfigured) {
      throw new Error("You need to be signed in to update your tribe.");
    }

    const existingPreference = getPreference(creatorId);
    const payload = {
      user_id: session.id,
      creator_profile_id: creatorId,
      selected: updates.selected ?? existingPreference?.selected ?? false,
      weight: updates.weight ?? existingPreference?.weight ?? 50
    };

    const { error, data } = await supabase
      .from("tribe_memberships")
      .upsert(payload, {
        onConflict: "user_id,creator_profile_id"
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const mappedPreference = {
      id: data.id,
      creatorId: data.creator_profile_id,
      userId: data.user_id,
      weight: data.weight,
      selected: data.selected
    };

    setPreferences((current) => {
      const exists = current.some((preference) => preference.creatorId === creatorId);

      if (exists) {
        return current.map((preference) =>
          preference.creatorId === creatorId ? mappedPreference : preference
        );
      }

      return [...current, mappedPreference];
    });
  }

  async function addToTribe(creatorId) {
    const existingPreference = getPreference(creatorId);

    await updatePreference(creatorId, {
      selected: true,
      weight: existingPreference?.weight || 50
    });
  }

  async function removeFromTribe(creatorId) {
    const existingPreference = getPreference(creatorId);

    if (!existingPreference) {
      return;
    }

    await updatePreference(creatorId, {
      selected: false,
      weight: existingPreference.weight || 50
    });
  }

  async function submitDomainRequest(domain, sourceUrl = "") {
    if (isDemoSession) {
      const trimmedDomain = domain.trim();

      if (!trimmedDomain) {
        throw new Error("Enter a domain to request.");
      }

      const nextRequestedDomains = Array.from(new Set([trimmedDomain, ...requestedDomains]));
      setRequestedDomains(nextRequestedDomains);
      await persistAppState({ requestedDomains: nextRequestedDomains });
      return;
    }

    if (!session?.id || !isConfigured) {
      throw new Error("You need to be signed in to request a domain.");
    }

    const trimmedDomain = domain.trim();

    if (!trimmedDomain) {
      throw new Error("Enter a domain to request.");
    }

    const { error, data } = await supabase
      .from("domain_requests")
      .upsert({
        user_id: session.id,
        domain: trimmedDomain,
        source_url: sourceUrl || null,
        status: "requested"
      }, {
        onConflict: "user_id,domain"
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    setRequestedDomains((current) => Array.from(new Set([data.domain, ...current])));
  }

  async function recordRoutingEvent({ creatorId, destinationUrl, domain, generatedUrl, openedAt }) {
    if (!session?.id || !isConfigured) {
      return;
    }

    const { error } = await supabase.from("routing_events").insert({
      user_id: session.id,
      creator_profile_id: creatorId,
      destination_url: destinationUrl,
      domain,
      generated_url: generatedUrl,
      opened_at: openedAt || null
    });

    if (error) {
      console.error("Failed to record routing event", error);
    }
  }

  const tribeCreators = creators
    .map((creator) => {
      const preference = getPreference(creator.id);

      if (!preference?.selected) {
        return null;
      }

      return {
        ...creator,
        weight: distributionMode === "even" ? null : preference.weight || 50
      };
    })
    .filter(Boolean);

  const currentTutorialStep = getTutorialStep(tutorialStepId);
  const brandHasActiveCampaign = Boolean(brandInstallStatus?.has_active_campaign);

  const value = useMemo(
    () => ({
      addAffiliateLink,
      addToTribe,
      archiveCreatorBrandLink,
      advanceTutorial,
      createCreatorBrandLink,
      completeCreatorOnboarding,
      connectSocialAccount,
      creators,
      creatorOnboardingPending,
      creatorBrandLinks,
      creatorSocialAccounts,
      creatorProfileId,
      brandHasActiveCampaign,
      brandInstallStatus,
      brandInstallStatusLoading,
      brandShopDomain,
      createBrandCampaign,
      refreshBrandInstallStatus,
      setBrandShopDomain,
      currentCreator,
      currentTutorialStep,
      distributionMode,
      availableLocaleCountries,
      getAvailableLocaleLanguages,
      getPreference,
      intent,
      isConfigured,
      isReady,
      locale,
      localeSelectionRequired,
      preferences,
      recordRoutingEvent,
      removeAffiliateLink,
      removeFromTribe,
      requestedDomains,
      session,
      skipTutorial,
      startTutorial,
      setDistributionMode,
      setIntent,
      signInAsDemo,
      signInWithGoogle,
      signInWithGoogleOAuth,
      signInWithPassword,
      signOut,
      setLocaleSelection,
      submitDomainRequest,
      t,
      tutorialActive,
      tutorialCompleted,
      tutorialStepId,
      tribeCreators,
      updateCreatorBrandLinkStatus,
      updatePreference
    }),
    [
      brandHasActiveCampaign,
      brandInstallStatus,
      brandInstallStatusLoading,
      brandShopDomain,
      currentTutorialStep,
      creators,
      creatorBrandLinks,
      creatorOnboardingPending,
      creatorSocialAccounts,
      creatorProfileId,
      currentCreator,
      distributionMode,
      availableLocaleCountries,
      isDemoSession,
      intent,
      isConfigured,
      isReady,
      locale,
      localeSelectionRequired,
      preferences,
      requestedDomains,
      session,
      t,
      tutorialActive,
      tutorialCompleted,
      tutorialStepId,
      tribeCreators
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within AppProvider.");
  }

  return context;
}
