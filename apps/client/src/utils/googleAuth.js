import Constants from "expo-constants";

function hasRealOAuthValue(value) {
  if (!value) {
    return false;
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return false;
  }

  return !normalized.startsWith("YOUR_");
}

export function getGoogleAuthConfig() {
  const extra = Constants.expoConfig?.extra || {};
  const webClientId = extra.googleWebClientId || "";

  return {
    androidClientId: extra.googleAndroidClientId || "",
    clientId: webClientId,
    expoClientId: extra.googleExpoClientId || "",
    iosClientId: extra.googleIosClientId || "",
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
    webClientId
  };
}

export function isGoogleAuthConfigured(config) {
  return Boolean(
    hasRealOAuthValue(config.expoClientId) ||
      hasRealOAuthValue(config.androidClientId) ||
      hasRealOAuthValue(config.iosClientId) ||
      hasRealOAuthValue(config.webClientId)
  );
}

export async function fetchGoogleUserInfo(accessToken) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error("Unable to load your Google profile.");
  }

  return response.json();
}
