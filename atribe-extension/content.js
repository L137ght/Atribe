(function () {
  "use strict";

  const CONFIG_KEYS = {
    backendBaseUrl: "atribeBackendBaseUrl",
    userId: "atribeUserId"
  };
  const ROUTE_GUARD_KEY = "atribe-route-guard";
  const AMAZON_HOST_PATTERN = /(^|\.)amazon\.[a-z.]+$/i;

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
    return `${backendBaseUrl}/u/${encodeURIComponent(userId)}/route?url=${encodeURIComponent(currentUrl.href)}`;
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
