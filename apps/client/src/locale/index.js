const DEFAULT_THEME_ID = "nocturne-editorial";

const LANGUAGE_LABELS = {
  "de-CH": "Deutsch (Schweiz)",
  "en-CA": "English (Canada)",
  "en-FR": "English (France)",
  "en-IN": "English (India)",
  "en-US": "English (United States)",
  "es-US": "Español (Estados Unidos)",
  "fr-CA": "Français (Canada)",
  "fr-CH": "Français (Suisse)",
  "fr-FR": "Français (France)",
  "hi-IN": "हिन्दी (भारत)",
  "it-CH": "Italiano (Svizzera)"
};

const NOCTURNE_EDITORIAL_TRANSLATIONS = {
  "en-US": {
    navigation: {
      brand: "Brand",
      campaign: "Campaign",
      dashboard: "Dashboard",
      discover: "Discover",
      links: "Links",
      settings: "Settings"
    },
    landing: {
      getStarted: "Get Started",
      login: "Log in",
      heroTitle: "Shop Your Favorite Brands. Support Your Favorite Creators.",
      heroTitleCompact: "Shop\nBrands.\nSupport\nCreators.",
      heroBody:
        "Atribe is a new way to support creators while gaining exclusive rewards and access to their most engaged community.",
      heroEmphasis: "Better Deals. No added Costs",
      heroEmphasisCompact: "Better Deals. No Extra Cost"
    },
    login: {
      heroTitle: "Back the creators you love.",
      heroBody: "Shop Better Deals. No extra cost.",
      welcome: "Welcome",
      continue: "Sign in to continue",
      signingIn: "Signing in...",
      preparingGoogle: "Preparing Google...",
      continueWithGoogle: "Continue with Google",
      orUseEmail: "or use email",
      emailAddress: "Email address",
      password: "Password",
      signInWithEmail: "Sign in with email",
      shopperDemo: "Use shopper demo",
      creatorDemo: "Use creator demo",
      alerts: {
        googleTitle: "Google Login",
        googleCanceled: "Google sign-in was canceled.",
        googleFailed: "Google sign-in failed. Check OAuth client settings.",
        googleNoIdToken: "Google did not return an ID token.",
        supabaseTitle: "Supabase setup",
        supabaseBody:
          "Add your Supabase URL and publishable key to .env.local before signing in.",
        googleConfigBody:
          "Add your Google OAuth client IDs in app.json under expo.extra before signing in.",
        googleLoading: "Google sign-in is still loading. Please try again.",
        googleUnable: "Unable to start Google login.",
        emailTitle: "Email login",
        emailMissing: "Enter an email and password."
      }
    },
    settings: {
      workspaceEyebrow: "Workspace",
      workspaceTitle: "Preferences and access",
      workspaceBody: "Manage your account details and your creator tribe.",
      localeTitle: "Language and region",
      localeBody:
        "Choose the country and language Atribe should use on this device. Browser clients default to your browser language until you change it.",
      localeCurrent: "Current locale",
      localeChange: "Change language",
      localeSaved: "Language updated",
      localeSavedBody: "Your country and language preference have been updated."
    },
    localePicker: {
      eyebrow: "Locale",
      title: "Choose your country and language",
      body:
        "Atribe tailors language by country. Pick a country first, then choose from the languages available for that market.",
      countryLabel: "Country",
      languageLabel: "Language",
      continue: "Continue",
      save: "Save language",
      helper: "You can change this later from Settings.",
      current: "Selected locale"
    }
  },
  "es-US": {
    navigation: {
      brand: "Marca",
      campaign: "Campaña",
      dashboard: "Panel",
      discover: "Descubrir",
      links: "Enlaces",
      settings: "Ajustes"
    },
    landing: {
      getStarted: "Comenzar",
      login: "Iniciar sesión",
      heroTitle: "Compra tus marcas favoritas. Apoya a tus creadores favoritos.",
      heroTitleCompact: "Compra\nmarcas.\nApoya a\ncreadores.",
      heroBody:
        "Atribe es una nueva forma de apoyar a creadores mientras obtienes recompensas exclusivas y acceso a su comunidad más comprometida.",
      heroEmphasis: "Mejores ofertas. Sin costo extra",
      heroEmphasisCompact: "Mejores ofertas. Sin costo extra"
    },
    login: {
      heroTitle: "Apoya a los creadores que te encantan.",
      heroBody: "Compra mejores ofertas. Sin costo extra.",
      welcome: "Bienvenido",
      continue: "Inicia sesión para continuar",
      signingIn: "Iniciando sesión...",
      preparingGoogle: "Preparando Google...",
      continueWithGoogle: "Continuar con Google",
      orUseEmail: "o usa correo",
      emailAddress: "Correo electrónico",
      password: "Contraseña",
      signInWithEmail: "Entrar con correo",
      shopperDemo: "Usar demo comprador",
      creatorDemo: "Usar demo creador",
      alerts: {
        googleTitle: "Inicio de Google",
        googleCanceled: "Se canceló el inicio de sesión con Google.",
        googleFailed: "Falló el inicio de sesión con Google. Revisa la configuración OAuth.",
        googleNoIdToken: "Google no devolvió un ID token.",
        supabaseTitle: "Configuración de Supabase",
        supabaseBody:
          "Agrega tu URL de Supabase y la clave publicable en .env.local antes de iniciar sesión.",
        googleConfigBody:
          "Agrega tus clientes OAuth de Google en app.json dentro de expo.extra antes de iniciar sesión.",
        googleLoading: "Google aún se está cargando. Inténtalo de nuevo.",
        googleUnable: "No se pudo iniciar Google.",
        emailTitle: "Inicio con correo",
        emailMissing: "Ingresa correo y contraseña."
      }
    },
    settings: {
      workspaceEyebrow: "Espacio",
      workspaceTitle: "Preferencias y acceso",
      workspaceBody: "Administra tu cuenta y tu tribu de creadores.",
      localeTitle: "Idioma y región",
      localeBody:
        "Elige el país y el idioma que Atribe debe usar en este dispositivo. Los clientes del navegador usan tu idioma del navegador hasta que lo cambies.",
      localeCurrent: "Configuración actual",
      localeChange: "Cambiar idioma",
      localeSaved: "Idioma actualizado",
      localeSavedBody: "Se actualizó tu preferencia de país e idioma."
    },
    localePicker: {
      eyebrow: "Idioma",
      title: "Elige tu país e idioma",
      body:
        "Atribe adapta el idioma según el país. Primero elige un país y después el idioma disponible para ese mercado.",
      countryLabel: "País",
      languageLabel: "Idioma",
      continue: "Continuar",
      save: "Guardar idioma",
      helper: "Puedes cambiarlo después desde Ajustes.",
      current: "Configuración seleccionada"
    }
  },
  "hi-IN": {
    navigation: {
      brand: "ब्रांड",
      campaign: "कैंपेन",
      dashboard: "डैशबोर्ड",
      discover: "खोजें",
      links: "लिंक",
      settings: "सेटिंग्स"
    },
    landing: {
      getStarted: "शुरू करें",
      login: "लॉग इन",
      heroTitle: "अपने पसंदीदा ब्रांड खरीदें। अपने पसंदीदा क्रिएटर्स को सपोर्ट करें।",
      heroTitleCompact: "ब्रांड\nखरीदें.\nक्रिएटर्स को\nसपोर्ट करें.",
      heroBody:
        "Atribe क्रिएटर्स को सपोर्ट करने का नया तरीका है, जहां आपको एक्सक्लूसिव रिवॉर्ड्स और उनकी सबसे सक्रिय कम्युनिटी तक पहुंच मिलती है।",
      heroEmphasis: "बेहतर डील्स. कोई अतिरिक्त लागत नहीं",
      heroEmphasisCompact: "बेहतर डील्स. कोई अतिरिक्त लागत नहीं"
    },
    login: {
      heroTitle: "जिन क्रिएटर्स को आप पसंद करते हैं उन्हें सपोर्ट करें.",
      heroBody: "बेहतर डील्स के साथ खरीदें. बिना अतिरिक्त लागत.",
      welcome: "स्वागत है",
      continue: "आगे बढ़ने के लिए लॉग इन करें",
      signingIn: "लॉग इन हो रहा है...",
      preparingGoogle: "Google तैयार हो रहा है...",
      continueWithGoogle: "Google से जारी रखें",
      orUseEmail: "या ईमेल से",
      emailAddress: "ईमेल पता",
      password: "पासवर्ड",
      signInWithEmail: "ईमेल से लॉग इन करें",
      shopperDemo: "शॉपर डेमो चलाएं",
      creatorDemo: "क्रिएटर डेमो चलाएं",
      alerts: {
        googleTitle: "Google लॉगिन",
        googleCanceled: "Google साइन-इन रद्द कर दिया गया.",
        googleFailed: "Google साइन-इन विफल रहा. OAuth सेटिंग्स जांचें.",
        googleNoIdToken: "Google ने ID token वापस नहीं किया.",
        supabaseTitle: "Supabase सेटअप",
        supabaseBody:
          "लॉग इन करने से पहले .env.local में Supabase URL और publishable key जोड़ें.",
        googleConfigBody:
          "लॉग इन करने से पहले app.json के expo.extra में Google OAuth client IDs जोड़ें.",
        googleLoading: "Google साइन-इन अभी लोड हो रहा है. फिर कोशिश करें.",
        googleUnable: "Google लॉगिन शुरू नहीं हो सका.",
        emailTitle: "ईमेल लॉगिन",
        emailMissing: "ईमेल और पासवर्ड दर्ज करें."
      }
    },
    settings: {
      workspaceEyebrow: "वर्कस्पेस",
      workspaceTitle: "प्राथमिकताएं और एक्सेस",
      workspaceBody: "अपना अकाउंट और अपनी क्रिएटर ट्राइब मैनेज करें.",
      localeTitle: "भाषा और क्षेत्र",
      localeBody:
        "इस डिवाइस पर Atribe के लिए देश और भाषा चुनें. ब्राउज़र क्लाइंट आपके ब्राउज़र की भाषा का उपयोग करेंगे जब तक आप उसे बदल नहीं देते.",
      localeCurrent: "मौजूदा भाषा",
      localeChange: "भाषा बदलें",
      localeSaved: "भाषा अपडेट हो गई",
      localeSavedBody: "आपकी देश और भाषा प्राथमिकता अपडेट हो गई है."
    },
    localePicker: {
      eyebrow: "भाषा",
      title: "अपना देश और भाषा चुनें",
      body:
        "Atribe देश के आधार पर भाषा चुनता है. पहले देश चुनें, फिर उस मार्केट के लिए उपलब्ध भाषा चुनें.",
      countryLabel: "देश",
      languageLabel: "भाषा",
      continue: "जारी रखें",
      save: "भाषा सहेजें",
      helper: "इसे बाद में Settings से बदला जा सकता है.",
      current: "चुना गया विकल्प"
    }
  },
  "fr-FR": {
    navigation: {
      brand: "Marque",
      campaign: "Campagne",
      dashboard: "Tableau",
      discover: "Découvrir",
      links: "Liens",
      settings: "Réglages"
    },
    landing: {
      getStarted: "Commencer",
      login: "Se connecter",
      heroTitle: "Achetez vos marques préférées. Soutenez vos créateurs préférés.",
      heroTitleCompact: "Achetez\nvos marques.\nSoutenez vos\ncréateurs.",
      heroBody:
        "Atribe est une nouvelle façon de soutenir des créateurs tout en obtenant des récompenses exclusives et un accès à leur communauté la plus engagée.",
      heroEmphasis: "Meilleures offres. Aucun coût supplémentaire",
      heroEmphasisCompact: "Meilleures offres. Aucun coût supplémentaire"
    },
    login: {
      heroTitle: "Soutenez les créateurs que vous aimez.",
      heroBody: "Achetez mieux. Sans coût supplémentaire.",
      welcome: "Bienvenue",
      continue: "Connectez-vous pour continuer",
      signingIn: "Connexion...",
      preparingGoogle: "Préparation de Google...",
      continueWithGoogle: "Continuer avec Google",
      orUseEmail: "ou utiliser l’e-mail",
      emailAddress: "Adresse e-mail",
      password: "Mot de passe",
      signInWithEmail: "Se connecter par e-mail",
      shopperDemo: "Utiliser la démo acheteur",
      creatorDemo: "Utiliser la démo créateur",
      alerts: {
        googleTitle: "Connexion Google",
        googleCanceled: "La connexion Google a été annulée.",
        googleFailed: "La connexion Google a échoué. Vérifiez les paramètres OAuth.",
        googleNoIdToken: "Google n’a pas renvoyé d’ID token.",
        supabaseTitle: "Configuration Supabase",
        supabaseBody:
          "Ajoutez votre URL Supabase et votre clé publique à .env.local avant de vous connecter.",
        googleConfigBody:
          "Ajoutez vos IDs clients OAuth Google dans app.json sous expo.extra avant de vous connecter.",
        googleLoading: "La connexion Google charge encore. Réessayez.",
        googleUnable: "Impossible de lancer la connexion Google.",
        emailTitle: "Connexion e-mail",
        emailMissing: "Saisissez un e-mail et un mot de passe."
      }
    },
    settings: {
      workspaceEyebrow: "Espace",
      workspaceTitle: "Préférences et accès",
      workspaceBody: "Gérez votre compte et votre tribu de créateurs.",
      localeTitle: "Langue et région",
      localeBody:
        "Choisissez le pays et la langue à utiliser sur cet appareil. Les clients web utilisent d’abord la langue du navigateur jusqu’à votre modification.",
      localeCurrent: "Paramètre actuel",
      localeChange: "Changer la langue",
      localeSaved: "Langue mise à jour",
      localeSavedBody: "Votre préférence de pays et de langue a été mise à jour."
    },
    localePicker: {
      eyebrow: "Langue",
      title: "Choisissez votre pays et votre langue",
      body:
        "Atribe adapte la langue selon le pays. Choisissez d’abord un pays, puis une langue disponible pour ce marché.",
      countryLabel: "Pays",
      languageLabel: "Langue",
      continue: "Continuer",
      save: "Enregistrer la langue",
      helper: "Vous pourrez le modifier plus tard dans Réglages.",
      current: "Paramètre sélectionné"
    }
  },
  "de-CH": {
    navigation: {
      brand: "Marke",
      campaign: "Kampagne",
      dashboard: "Dashboard",
      discover: "Entdecken",
      links: "Links",
      settings: "Einstellungen"
    },
    localePicker: {
      eyebrow: "Sprache",
      title: "Land und Sprache wählen",
      body:
        "Atribe ordnet Sprache nach Land zu. Wähle zuerst ein Land und dann eine verfügbare Sprache für diesen Markt.",
      countryLabel: "Land",
      languageLabel: "Sprache",
      continue: "Weiter",
      save: "Sprache speichern",
      helper: "Das kannst du später in den Einstellungen ändern.",
      current: "Ausgewählte Einstellung"
    }
  },
  "it-CH": {
    navigation: {
      brand: "Brand",
      campaign: "Campagna",
      dashboard: "Dashboard",
      discover: "Scopri",
      links: "Link",
      settings: "Impostazioni"
    },
    localePicker: {
      eyebrow: "Lingua",
      title: "Scegli paese e lingua",
      body:
        "Atribe adatta la lingua in base al paese. Scegli prima il paese, poi una lingua disponibile per quel mercato.",
      countryLabel: "Paese",
      languageLabel: "Lingua",
      continue: "Continua",
      save: "Salva lingua",
      helper: "Potrai cambiarla più tardi dalle Impostazioni.",
      current: "Selezione attuale"
    }
  }
};

const THEME_LOCALE_CONFIGS = {
  [DEFAULT_THEME_ID]: {
    themeId: DEFAULT_THEME_ID,
    defaultCountryCode: "US",
    defaultLanguageTag: "en-US",
    countries: [
      {
        code: "US",
        label: "United States",
        defaultLanguageTag: "en-US",
        supportedLanguageTags: ["en-US", "es-US"]
      },
      {
        code: "IN",
        label: "India",
        defaultLanguageTag: "en-IN",
        supportedLanguageTags: ["en-IN", "hi-IN"]
      },
      {
        code: "CA",
        label: "Canada",
        defaultLanguageTag: "en-CA",
        supportedLanguageTags: ["en-CA", "fr-CA"]
      },
      {
        code: "CH",
        label: "Switzerland",
        defaultLanguageTag: "de-CH",
        supportedLanguageTags: ["de-CH", "fr-CH", "it-CH"]
      },
      {
        code: "FR",
        label: "France",
        defaultLanguageTag: "fr-FR",
        supportedLanguageTags: ["fr-FR", "en-FR"]
      }
    ],
    translations: NOCTURNE_EDITORIAL_TRANSLATIONS
  }
};

function normalizeLanguageTag(languageTag) {
  const trimmedValue = String(languageTag || "").trim().replace(/_/g, "-");

  if (!trimmedValue) {
    return "";
  }

  const segments = trimmedValue.split("-").filter(Boolean);

  if (!segments.length) {
    return "";
  }

  const [language, region] = segments;
  const normalizedLanguage = language.toLowerCase();

  if (!region) {
    return normalizedLanguage;
  }

  return `${normalizedLanguage}-${region.toUpperCase()}`;
}

function normalizeCountryCode(countryCode) {
  return String(countryCode || "").trim().toUpperCase();
}

function flattenLanguageMatches(themeConfig) {
  return themeConfig.countries.reduce((matches, country) => {
    country.supportedLanguageTags.forEach((languageTag) => {
      matches.push({
        countryCode: country.code,
        languageTag,
        countryDefaultLanguageTag: country.defaultLanguageTag
      });
    });
    return matches;
  }, []);
}

function getCountryConfig(themeConfig, countryCode) {
  return themeConfig.countries.find((country) => country.code === normalizeCountryCode(countryCode)) || null;
}

function findLanguageMatch(countryConfig, normalizedLanguageTag) {
  if (!countryConfig || !normalizedLanguageTag) {
    return null;
  }

  const exactMatch = countryConfig.supportedLanguageTags.find(
    (languageTag) => normalizeLanguageTag(languageTag) === normalizedLanguageTag
  );

  if (exactMatch) {
    return exactMatch;
  }

  const baseLanguage = normalizedLanguageTag.split("-")[0];
  return (
    countryConfig.supportedLanguageTags.find(
      (languageTag) => normalizeLanguageTag(languageTag).split("-")[0] === baseLanguage
    ) || null
  );
}

function inferCountryFromLanguageTag(languageTag) {
  const normalizedLanguageTag = normalizeLanguageTag(languageTag);

  if (!normalizedLanguageTag.includes("-")) {
    return "";
  }

  return normalizedLanguageTag.split("-")[1] || "";
}

function getNestedValue(object, keyPath) {
  return keyPath.split(".").reduce((currentValue, key) => {
    if (!currentValue || typeof currentValue !== "object") {
      return undefined;
    }

    return currentValue[key];
  }, object);
}

export function getThemeLocaleConfig(themeId = DEFAULT_THEME_ID) {
  return THEME_LOCALE_CONFIGS[themeId] || THEME_LOCALE_CONFIGS[DEFAULT_THEME_ID];
}

export function getSupportedCountries(themeId = DEFAULT_THEME_ID) {
  return [...getThemeLocaleConfig(themeId).countries];
}

export function getSupportedLanguages(themeId = DEFAULT_THEME_ID, countryCode) {
  const themeConfig = getThemeLocaleConfig(themeId);
  const countryConfig = getCountryConfig(themeConfig, countryCode);

  if (!countryConfig) {
    return [];
  }

  return countryConfig.supportedLanguageTags.map((languageTag) => ({
    tag: languageTag,
    label: LANGUAGE_LABELS[languageTag] || languageTag,
    copyNamespace: normalizeLanguageTag(languageTag).split("-")[0]
  }));
}

export function getTranslations(themeId = DEFAULT_THEME_ID, languageTag) {
  const themeConfig = getThemeLocaleConfig(themeId);
  const normalizedLanguageTag = normalizeLanguageTag(languageTag) || themeConfig.defaultLanguageTag;
  const languageFamilyTag = normalizedLanguageTag.split("-")[0];
  const defaultTranslations = themeConfig.translations[themeConfig.defaultLanguageTag] || {};
  const familyMatch =
    Object.entries(themeConfig.translations).find(
      ([tag]) => normalizeLanguageTag(tag).split("-")[0] === languageFamilyTag
    )?.[1] || {};
  const exactTranslations = themeConfig.translations[normalizedLanguageTag] || {};

  return {
    ...defaultTranslations,
    ...familyMatch,
    ...exactTranslations
  };
}

export function translate(translations, keyPath, fallbackValue = keyPath) {
  return getNestedValue(translations, keyPath) ?? fallbackValue;
}

export function getBrowserLanguagePreferences() {
  if (typeof navigator === "undefined") {
    const fallbackLocale =
      typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().locale : "";
    return fallbackLocale ? [normalizeLanguageTag(fallbackLocale)] : [];
  }

  const nextLanguages = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language].filter(Boolean);

  return nextLanguages.map(normalizeLanguageTag).filter(Boolean);
}

export function resolveThemeLocale({
  themeConfig = getThemeLocaleConfig(DEFAULT_THEME_ID),
  persistedSelection = null,
  browserLanguages = [],
  inferredCountry = "",
  storefrontContext = null
} = {}) {
  const normalizedPersistedCountry = normalizeCountryCode(persistedSelection?.countryCode);
  const normalizedPersistedLanguage = normalizeLanguageTag(persistedSelection?.languageTag);
  const persistedCountryConfig = getCountryConfig(themeConfig, normalizedPersistedCountry);

  if (persistedCountryConfig) {
    const matchedLanguage =
      findLanguageMatch(persistedCountryConfig, normalizedPersistedLanguage) ||
      persistedCountryConfig.defaultLanguageTag;

    return {
      countryCode: persistedCountryConfig.code,
      languageTag: matchedLanguage,
      source: persistedSelection?.source || "persisted"
    };
  }

  const normalizedBrowserLanguages = browserLanguages
    .map(normalizeLanguageTag)
    .filter(Boolean);
  const inferredCountryCode =
    normalizeCountryCode(storefrontContext?.countryCode) ||
    normalizeCountryCode(inferredCountry) ||
    normalizeCountryCode(inferCountryFromLanguageTag(normalizedBrowserLanguages[0]));
  const inferredCountryConfig = getCountryConfig(themeConfig, inferredCountryCode);

  if (inferredCountryConfig) {
    const matchedLanguage =
      normalizedBrowserLanguages
        .map((languageTag) => findLanguageMatch(inferredCountryConfig, languageTag))
        .find(Boolean) || inferredCountryConfig.defaultLanguageTag;

    return {
      countryCode: inferredCountryConfig.code,
      languageTag: matchedLanguage,
      source: normalizedBrowserLanguages.length ? "browser" : "inferred-country"
    };
  }

  const flattenedMatches = flattenLanguageMatches(themeConfig);

  for (const languageTag of normalizedBrowserLanguages) {
    const exactMatch = flattenedMatches.find(
      (match) => normalizeLanguageTag(match.languageTag) === languageTag
    );

    if (exactMatch) {
      return {
        countryCode: exactMatch.countryCode,
        languageTag: exactMatch.languageTag,
        source: "browser"
      };
    }

    const baseLanguage = languageTag.split("-")[0];
    const familyMatch = flattenedMatches.find(
      (match) => normalizeLanguageTag(match.languageTag).split("-")[0] === baseLanguage
    );

    if (familyMatch) {
      return {
        countryCode: familyMatch.countryCode,
        languageTag: familyMatch.languageTag,
        source: "browser"
      };
    }
  }

  return {
    countryCode: themeConfig.defaultCountryCode,
    languageTag: themeConfig.defaultLanguageTag,
    source: "default"
  };
}

export {
  DEFAULT_THEME_ID,
  LANGUAGE_LABELS,
  inferCountryFromLanguageTag,
  normalizeCountryCode,
  normalizeLanguageTag
};
