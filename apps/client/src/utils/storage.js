import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  appState: "creator-router.app-state",
  creators: "creator-router.creators",
  preferences: "creator-router.preferences",
  socialAccounts: "creator-router.social-accounts",
  session: "creator-router.session"
};

async function readJson(key, fallbackValue) {
  const rawValue = await AsyncStorage.getItem(key);

  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return fallbackValue;
  }
}

function writeJson(key, value) {
  return AsyncStorage.setItem(key, JSON.stringify(value));
}

export function loadSession() {
  return readJson(STORAGE_KEYS.session, null);
}

export function saveSession(session) {
  return writeJson(STORAGE_KEYS.session, session);
}

export function clearSessionStorage() {
  return AsyncStorage.removeItem(STORAGE_KEYS.session);
}

export function loadAppState() {
  return readJson(STORAGE_KEYS.appState, {
    creatorProfileId: null,
    brandShopDomain: null,
    intent: null,
    forceIntentSelection: false,
    requestedDomains: [],
    distributionMode: "weighted",
    tutorialActive: false,
    tutorialCompleted: false,
    tutorialStepId: "home"
  });
}

export function saveAppState(appState) {
  return writeJson(STORAGE_KEYS.appState, appState);
}

export function loadCreators() {
  return readJson(STORAGE_KEYS.creators, []);
}

export function saveCreators(creators) {
  return writeJson(STORAGE_KEYS.creators, creators);
}

export function loadPreferences() {
  return readJson(STORAGE_KEYS.preferences, []);
}

export function savePreferences(preferences) {
  return writeJson(STORAGE_KEYS.preferences, preferences);
}

export function loadSocialAccounts() {
  return readJson(STORAGE_KEYS.socialAccounts, []);
}

export function saveSocialAccounts(socialAccounts) {
  return writeJson(STORAGE_KEYS.socialAccounts, socialAccounts);
}
