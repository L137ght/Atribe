(function () {
  "use strict";

  const AFFILIATE_TAG = "testtag-20";
  const RELOAD_GUARD_KEY = "amazon-affiliate-reload";
  const AMAZON_HOST_PATTERN = /(^|\.)amazon\.[a-z.]+$/i;

  let lastHandledUrl = "";
  let checkScheduled = false;

  function isAmazonHost(url) {
    return AMAZON_HOST_PATTERN.test(url.hostname);
  }

  function isProductPage(url) {
    return isAmazonHost(url) && url.pathname.includes("/dp/");
  }

  function getTaggedUrl(url) {
    const nextUrl = new URL(url.href);
    nextUrl.searchParams.set("tag", AFFILIATE_TAG);
    return nextUrl;
  }

  function clearReloadGuardIfNeeded(url) {
    const guardValue = sessionStorage.getItem(RELOAD_GUARD_KEY);

    if (guardValue && guardValue !== url.href) {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
    }
  }

  function processPage() {
    checkScheduled = false;

    const currentUrl = new URL(window.location.href);

    if (currentUrl.href === lastHandledUrl) {
      return;
    }

    lastHandledUrl = currentUrl.href;
    clearReloadGuardIfNeeded(currentUrl);

    if (!isProductPage(currentUrl)) {
      return;
    }

    const currentTag = currentUrl.searchParams.get("tag");

    if (currentTag === AFFILIATE_TAG) {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
      return;
    }

    const taggedUrl = getTaggedUrl(currentUrl);
    const taggedHref = taggedUrl.href;

    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === taggedHref) {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
      return;
    }

    sessionStorage.setItem(RELOAD_GUARD_KEY, taggedHref);
    window.location.replace(taggedHref);
  }

  function scheduleProcessPage() {
    if (checkScheduled) {
      return;
    }

    checkScheduled = true;
    window.requestAnimationFrame(processPage);
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
