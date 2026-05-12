import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_THEME_ID,
  getThemeLocaleConfig,
  resolveThemeLocale
} from "./index.js";

test("resolveThemeLocale keeps explicit country and language when supported", () => {
  const themeConfig = getThemeLocaleConfig(DEFAULT_THEME_ID);
  const locale = resolveThemeLocale({
    themeConfig,
    persistedSelection: {
      countryCode: "IN",
      languageTag: "hi-IN",
      source: "explicit"
    },
    browserLanguages: ["en-US"]
  });

  assert.deepEqual(locale, {
    countryCode: "IN",
    languageTag: "hi-IN",
    source: "explicit"
  });
});

test("resolveThemeLocale falls back to country default when browser language is unsupported", () => {
  const themeConfig = getThemeLocaleConfig(DEFAULT_THEME_ID);
  const locale = resolveThemeLocale({
    themeConfig,
    inferredCountry: "CA",
    browserLanguages: ["hi-IN"]
  });

  assert.deepEqual(locale, {
    countryCode: "CA",
    languageTag: "en-CA",
    source: "browser"
  });
});

test("resolveThemeLocale picks the best browser language for a multi-language country", () => {
  const themeConfig = getThemeLocaleConfig(DEFAULT_THEME_ID);
  const locale = resolveThemeLocale({
    themeConfig,
    inferredCountry: "CH",
    browserLanguages: ["fr-FR", "en-US"]
  });

  assert.deepEqual(locale, {
    countryCode: "CH",
    languageTag: "fr-CH",
    source: "browser"
  });
});

test("resolveThemeLocale falls back to theme defaults without browser hints", () => {
  const themeConfig = getThemeLocaleConfig(DEFAULT_THEME_ID);
  const locale = resolveThemeLocale({
    themeConfig,
    browserLanguages: []
  });

  assert.deepEqual(locale, {
    countryCode: "US",
    languageTag: "en-US",
    source: "default"
  });
});
