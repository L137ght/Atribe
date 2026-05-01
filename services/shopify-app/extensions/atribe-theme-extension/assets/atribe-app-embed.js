(() => {
  const STORAGE_KEY = "atribe_attribution";
  const ATTRIBE_REF_KEY = "atribe_ref";
  const ATTRIBE_CLICK_KEY = "atribe_click";
  const ATTRIBE_USER_KEY = "atribe_user";
  const ATTRIBE_SNAPSHOT_KEY = "atribe_snapshot";
  const ATTRIBE_CREATOR_KEY = "atribe_creator";
  const ATTRIBE_TIMESTAMP_KEY = "atribe_timestamp";

  const safeRun = (fn) => {
    try {
      fn();
    } catch (_error) {
      // Attribution must never break the storefront experience.
    }
  };

  const readStoredAttribution = () => {
    const directRef = window.localStorage.getItem(ATTRIBE_REF_KEY);
    const directClick = window.localStorage.getItem(ATTRIBE_CLICK_KEY);
    const directUser = window.localStorage.getItem(ATTRIBE_USER_KEY);
    const directSnapshot = window.localStorage.getItem(ATTRIBE_SNAPSHOT_KEY);
    const directCreator = window.localStorage.getItem(ATTRIBE_CREATOR_KEY);
    const directTimestamp = window.localStorage.getItem(ATTRIBE_TIMESTAMP_KEY);

    if (directRef || directClick || directUser || directSnapshot || directCreator || directTimestamp) {
      return {
        atribe_ref: directRef || "",
        atribe_click: directClick || "",
        atribe_user: directUser || "",
        atribe_snapshot: directSnapshot || "",
        atribe_creator: directCreator || "",
        timestamp: directTimestamp || ""
      };
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return parsed;
  };

  const writeStoredAttribution = (value) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    window.localStorage.setItem(ATTRIBE_REF_KEY, value.atribe_ref || "");
    window.localStorage.setItem(ATTRIBE_CLICK_KEY, value.atribe_click || "");
    window.localStorage.setItem(ATTRIBE_USER_KEY, value.atribe_user || "");
    window.localStorage.setItem(ATTRIBE_SNAPSHOT_KEY, value.atribe_snapshot || "");
    window.localStorage.setItem(ATTRIBE_CREATOR_KEY, value.atribe_creator || "");
    window.localStorage.setItem(ATTRIBE_TIMESTAMP_KEY, value.timestamp || "");
  };

  const getUrlAttribution = () => {
    const params = new URLSearchParams(window.location.search);

    return {
      ref: params.get("atribe_ref") || "",
      click: params.get("atribe_click") || "",
      user: params.get("atribe_user") || "",
      snapshot: params.get("atribe_snapshot") || "",
      creator: params.get("atribe_creator") || ""
    };
  };

  const resolveAttribution = () => {
    const urlAttribution = getUrlAttribution();
    const stored = readStoredAttribution() || {};
    const isFreshAttribution =
      urlAttribution.ref !== "" ||
      urlAttribution.click !== "" ||
      urlAttribution.user !== "" ||
      urlAttribution.snapshot !== "" ||
      urlAttribution.creator !== "";

    if (isFreshAttribution) {
      return {
        atribe_ref: urlAttribution.ref || "",
        atribe_click: urlAttribution.click || "",
        atribe_user: urlAttribution.user || "",
        atribe_snapshot: urlAttribution.snapshot || "",
        atribe_creator: urlAttribution.creator || "",
        timestamp: new Date().toISOString()
      };
    }

    const ref = stored.atribe_ref || "";
    const click = stored.atribe_click || "";
    const user = stored.atribe_user || "";
    const snapshot = stored.atribe_snapshot || "";
    const creator = stored.atribe_creator || "";

    if (!ref && !click && !user && !snapshot && !creator) return null;

    return {
      atribe_ref: ref,
      atribe_click: click,
      atribe_user: user,
      atribe_snapshot: snapshot,
      atribe_creator: creator,
      timestamp: stored.timestamp || new Date().toISOString()
    };
  };

  const syncCartAttributes = async (attribution) => {
    const cartResponse = await fetch("/cart.js", {
      credentials: "same-origin",
      headers: {
        Accept: "application/json"
      }
    });

    if (!cartResponse.ok) return;

    const cart = await cartResponse.json();
    const currentAttributes = cart.attributes || {};
    const nextAttributes = {
      atribe_ref: attribution.atribe_ref,
      atribe_click: attribution.atribe_click || "",
      atribe_user: attribution.atribe_user || "",
      atribe_snapshot: attribution.atribe_snapshot || "",
      atribe_creator: attribution.atribe_creator || "",
      atribe_ts: attribution.timestamp
    };

    const isAlreadySynced =
      currentAttributes.atribe_ref === nextAttributes.atribe_ref &&
      (currentAttributes.atribe_click || "") === nextAttributes.atribe_click &&
      (currentAttributes.atribe_user || "") === nextAttributes.atribe_user &&
      (currentAttributes.atribe_snapshot || "") === nextAttributes.atribe_snapshot &&
      (currentAttributes.atribe_creator || "") === nextAttributes.atribe_creator &&
      currentAttributes.atribe_ts === nextAttributes.atribe_ts;

    if (isAlreadySynced) return;

    await fetch("/cart/update.js", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        attributes: nextAttributes
      }),
      keepalive: true
    });
  };

  const schedule = (fn) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => safeRun(fn), { timeout: 1500 });
      return;
    }

    window.setTimeout(() => safeRun(fn), 0);
  };

  safeRun(() => {
    const attribution = resolveAttribution();
    if (!attribution) return;

    writeStoredAttribution(attribution);

    schedule(async () => {
      try {
        await syncCartAttributes(attribution);
      } catch (_error) {
        // Best-effort sync only.
      }
    });
  });
})();
