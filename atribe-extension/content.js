(function () {
  "use strict";

  const CONFIG_KEYS = {
    backendBaseUrl: "atribeBackendBaseUrl",
    userId: "atribeUserId"
  };
  const ROUTE_GUARD_KEY = "atribe-route-guard";
  const LOCALE_STORAGE_KEY = "atribeLocale";
  const AMAZON_HOST_PATTERN = /(^|\.)amazon\.[a-z.]+$/i;
  const THEME_CONFIG = {
    themeId: "nocturne-editorial",
    defaultCountryCode: "US",
    defaultLanguageTag: "en-US",
    countries: [
      { code: "US", defaultLanguageTag: "en-US", supportedLanguageTags: ["en-US", "es-US"] },
      { code: "IN", defaultLanguageTag: "en-IN", supportedLanguageTags: ["en-IN", "hi-IN"] },
      { code: "CA", defaultLanguageTag: "en-CA", supportedLanguageTags: ["en-CA", "fr-CA"] },
      { code: "CH", defaultLanguageTag: "de-CH", supportedLanguageTags: ["de-CH", "fr-CH", "it-CH"] },
      { code: "FR", defaultLanguageTag: "fr-FR", supportedLanguageTags: ["fr-FR", "en-FR"] }
    ]
  };

  let lastHandledUrl = "";
  let checkScheduled = false;

  function normalizeBaseUrl(value) {
    const normalized = String(value || "").trim().replace(/\/+$/, "");

    if (!normalized) {
      return "";
    }

    try {
      return new URL(normalized).toString().replace(/\/+$/, "");
    } catch {
      return "";
    }
  }

  function isAmazonHost(url) {
    return AMAZON_HOST_PATTERN.test(url.hostname);
  }

  function isProductPage(url) {
    return isAmazonHost(url) && url.pathname.includes("/dp/");
  }

  function hasAtribeParams(url) {
    return url.searchParams.has("atribe_click") || url.searchParams.has("atribe_snapshot");
  }

  function isBackendUrl(currentUrl, backendBaseUrl) {
    if (!backendBaseUrl) {
      return false;
    }

    try {
      return currentUrl.origin === new URL(backendBaseUrl).origin;
    } catch {
      return false;
    }
  }

  function clearRouteGuardIfNeeded(url) {
    const guardValue = sessionStorage.getItem(ROUTE_GUARD_KEY);

    if (guardValue && guardValue !== url.href) {
      sessionStorage.removeItem(ROUTE_GUARD_KEY);
    }
  }

  function buildBackendRouteUrl(currentUrl, backendBaseUrl, userId) {
    const locale = resolveLocale();
    const params = new URLSearchParams({
      url: currentUrl.href
    });

    if (locale.countryCode) {
      params.set("atribe_country", locale.countryCode);
    }

    if (locale.languageTag) {
      params.set("atribe_lang", locale.languageTag);
    }

    return `${backendBaseUrl}/u/${encodeURIComponent(userId)}/route?${params.toString()}`;
  }

  function normalizeLanguageTag(languageTag) {
    const trimmedValue = String(languageTag || "").trim().replace(/_/g, "-");

    if (!trimmedValue) {
      return "";
    }

    const parts = trimmedValue.split("-").filter(Boolean);
    const [language, region] = parts;

    if (!region) {
      return language.toLowerCase();
    }

    return `${language.toLowerCase()}-${region.toUpperCase()}`;
  }

  function getCountryConfig(countryCode) {
    return THEME_CONFIG.countries.find((country) => country.code === String(countryCode || "").toUpperCase()) || null;
  }

  function findLanguageMatch(countryConfig, languageTag) {
    const normalizedLanguageTag = normalizeLanguageTag(languageTag);

    if (!countryConfig || !normalizedLanguageTag) {
      return null;
    }

    return (
      countryConfig.supportedLanguageTags.find((supportedLanguageTag) => {
        const normalizedSupportedLanguageTag = normalizeLanguageTag(supportedLanguageTag);
        return (
          normalizedSupportedLanguageTag === normalizedLanguageTag ||
          normalizedSupportedLanguageTag.split("-")[0] === normalizedLanguageTag.split("-")[0]
        );
      }) || null
    );
  }

  function inferCountryFromLanguage(languageTag) {
    const normalizedLanguageTag = normalizeLanguageTag(languageTag);

    return normalizedLanguageTag.includes("-") ? normalizedLanguageTag.split("-")[1] : "";
  }

  function resolveLocale() {
    const browserLanguages = (navigator.languages || [navigator.language]).map(normalizeLanguageTag).filter(Boolean);
    const inferredCountryCode = inferCountryFromLanguage(browserLanguages[0]);
    const inferredCountryConfig = getCountryConfig(inferredCountryCode);

    if (inferredCountryConfig) {
      const matchedLanguage =
        browserLanguages.map((languageTag) => findLanguageMatch(inferredCountryConfig, languageTag)).find(Boolean) ||
        inferredCountryConfig.defaultLanguageTag;
      const locale = {
        countryCode: inferredCountryConfig.code,
        languageTag: matchedLanguage,
        themeId: THEME_CONFIG.themeId,
        source: "browser"
      };
      window.localStorage.setItem(LOCALE_STORAGE_KEY, JSON.stringify(locale));
      return locale;
    }

    const locale = {
      countryCode: THEME_CONFIG.defaultCountryCode,
      languageTag: THEME_CONFIG.defaultLanguageTag,
      themeId: THEME_CONFIG.themeId,
      source: "default"
    };
    window.localStorage.setItem(LOCALE_STORAGE_KEY, JSON.stringify(locale));
    return locale;
  }

  function getExtensionConfig() {
    return new Promise((resolve) => {
      if (!chrome?.storage?.sync) {
        resolve({
          backendBaseUrl: "",
          userId: ""
        });
        return;
      }

      chrome.storage.sync.get([CONFIG_KEYS.backendBaseUrl, CONFIG_KEYS.userId], (result) => {
        resolve({
          backendBaseUrl: normalizeBaseUrl(result?.[CONFIG_KEYS.backendBaseUrl]),
          userId: String(result?.[CONFIG_KEYS.userId] || "").trim()
        });
      });
    });
  }

  async function processPage() {
    checkScheduled = false;

    const currentUrl = new URL(window.location.href);

    if (currentUrl.href === lastHandledUrl) {
      return;
    }

    lastHandledUrl = currentUrl.href;
    clearRouteGuardIfNeeded(currentUrl);

    if (!isProductPage(currentUrl) || hasAtribeParams(currentUrl)) {
      return;
    }

    const { backendBaseUrl, userId } = await getExtensionConfig();

    if (!backendBaseUrl || !userId || isBackendUrl(currentUrl, backendBaseUrl)) {
      return;
    }

    const routedUrl = buildBackendRouteUrl(currentUrl, backendBaseUrl, userId);

    if (sessionStorage.getItem(ROUTE_GUARD_KEY) === routedUrl) {
      sessionStorage.removeItem(ROUTE_GUARD_KEY);
      return;
    }

    sessionStorage.setItem(ROUTE_GUARD_KEY, routedUrl);
    window.location.replace(routedUrl);
  }

  function scheduleProcessPage() {
    if (checkScheduled) {
      return;
    }

    checkScheduled = true;
    window.requestAnimationFrame(() => {
      void processPage();
    });
  }

  function installHistoryListeners() {
    const { pushState, replaceState } = window.history;

    window.history.pushState = function pushStateWrapper() {
      const result = pushState.apply(this, arguments);
      scheduleProcessPage();
      return result;
    };

    window.history.replaceState = function replaceStateWrapper() {
      const result = replaceState.apply(this, arguments);
      scheduleProcessPage();
      return result;
    };

    window.addEventListener("popstate", scheduleProcessPage);
  }

  function installMutationObserver() {
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastHandledUrl) {
        scheduleProcessPage();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  installHistoryListeners();
  installMutationObserver();
  scheduleProcessPage();
})();
