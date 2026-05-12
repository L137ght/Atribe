import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  PrimaryButton,
  SecondaryButton,
  SectionHeader
} from "../components";
import { theme } from "../theme";

function showMessage(title, message) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

export default function LocalePickerScreen({ navigation }) {
  const {
    availableLocaleCountries,
    getAvailableLocaleLanguages,
    locale,
    session,
    setLocaleSelection,
    t
  } = useAppContext();
  const [countryCode, setCountryCode] = useState(
    locale?.countryCode || availableLocaleCountries[0]?.code || ""
  );
  const [languageTag, setLanguageTag] = useState(locale?.languageTag || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const languageOptions = useMemo(
    () => getAvailableLocaleLanguages(countryCode),
    [countryCode, getAvailableLocaleLanguages]
  );

  useEffect(() => {
    if (!languageOptions.length) {
      setLanguageTag("");
      return;
    }

    if (!languageOptions.some((language) => language.tag === languageTag)) {
      setLanguageTag(languageOptions[0].tag);
    }
  }, [languageOptions, languageTag]);

  async function handleSave() {
    if (!countryCode || !languageTag) {
      return;
    }

    setIsSubmitting(true);

    try {
      await setLocaleSelection({
        countryCode,
        languageTag
      });

      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }

      if (!session) {
        navigation.replace("Landing");
      }
    } catch (error) {
      showMessage(t("localePicker.eyebrow", "Locale"), error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell hideNavigation>
      <SectionHeader
        eyebrow={t("localePicker.eyebrow", "Locale")}
        title={t("localePicker.title", "Choose your country and language")}
        body={t(
          "localePicker.body",
          "Atribe tailors language by country. Pick a country first, then choose from the languages available for that market."
        )}
      />

      <View style={styles.grid}>
        <Card style={styles.column}>
          <Text style={styles.cardLabel}>{t("localePicker.countryLabel", "Country")}</Text>
          <View style={styles.optionGrid}>
            {availableLocaleCountries.map((country) => (
              <SecondaryButton
                key={country.code}
                label={country.label}
                onPress={() => setCountryCode(country.code)}
                selected={country.code === countryCode}
                style={styles.optionButton}
              />
            ))}
          </View>
        </Card>

        <Card style={styles.column}>
          <Text style={styles.cardLabel}>{t("localePicker.languageLabel", "Language")}</Text>
          <View style={styles.optionGrid}>
            {languageOptions.map((language) => (
              <SecondaryButton
                key={language.tag}
                label={language.label}
                onPress={() => setLanguageTag(language.tag)}
                selected={language.tag === languageTag}
                style={styles.optionButton}
              />
            ))}
          </View>

          <View style={styles.currentLocale}>
            <Text style={styles.currentTitle}>{t("localePicker.current", "Selected locale")}</Text>
            <BodyText>
              {countryCode} · {languageTag}
            </BodyText>
          </View>

          <BodyText>{t("localePicker.helper", "You can change this later from Settings.")}</BodyText>

          <PrimaryButton
            label={
              isSubmitting
                ? t("login.signingIn", "Saving...")
                : locale
                ? t("localePicker.save", "Save language")
                : t("localePicker.continue", "Continue")
            }
            onPress={handleSave}
            variant="gradient"
          />
        </Card>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.lg
  },
  column: {
    flex: 1,
    minWidth: 300
  },
  cardLabel: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    lineHeight: 30
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  optionButton: {
    alignSelf: "flex-start"
  },
  currentLocale: {
    gap: 4,
    paddingTop: theme.spacing.sm
  },
  currentTitle: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  }
});
