const CONFIG_KEYS = {
  backendBaseUrl: "atribeBackendBaseUrl",
  userId: "atribeUserId"
};

const backendUrlInput = document.getElementById("backend-url");
const userIdInput = document.getElementById("user-id");
const statusNode = document.getElementById("status");
const form = document.getElementById("settings-form");
const copy = {
  en: {
    title: "Atribe Extension Settings",
    body:
      "Configure the backend base URL and the supporter user id. The extension will route supported product URLs through the Atribe backend instead of applying a hardcoded affiliate tag.",
    backendLabel: "Atribe backend URL",
    backendPlaceholder: "https://your-backend.example.com",
    userLabel: "Supporter user id",
    userPlaceholder: "uuid",
    save: "Save settings",
    saved: "Settings saved.",
    invalid: "Enter a valid backend URL."
  },
  es: {
    title: "Configuración de Atribe Extension",
    body:
      "Configura la URL base del backend y el identificador del usuario comprador. La extensión enviará las URLs compatibles al backend de Atribe en lugar de aplicar una etiqueta de afiliado fija.",
    backendLabel: "URL del backend de Atribe",
    backendPlaceholder: "https://tu-backend.example.com",
    userLabel: "Id del usuario comprador",
    userPlaceholder: "uuid",
    save: "Guardar ajustes",
    saved: "Ajustes guardados.",
    invalid: "Ingresa una URL de backend válida."
  },
  hi: {
    title: "Atribe Extension सेटिंग्स",
    body:
      "बैकएंड बेस URL और supporter user id सेट करें. एक्सटेंशन hardcoded affiliate tag लगाने की जगह Atribe backend के जरिए समर्थित product URLs को route करेगा.",
    backendLabel: "Atribe backend URL",
    backendPlaceholder: "https://your-backend.example.com",
    userLabel: "Supporter user id",
    userPlaceholder: "uuid",
    save: "सेटिंग्स सहेजें",
    saved: "सेटिंग्स सहेज ली गईं.",
    invalid: "मान्य backend URL दर्ज करें."
  },
  fr: {
    title: "Paramètres de l’extension Atribe",
    body:
      "Configurez l’URL de base du backend et l’identifiant de l’utilisateur acheteur. L’extension redirigera les URL produit prises en charge via le backend Atribe au lieu d’appliquer un tag affilié en dur.",
    backendLabel: "URL du backend Atribe",
    backendPlaceholder: "https://votre-backend.example.com",
    userLabel: "Id de l’utilisateur acheteur",
    userPlaceholder: "uuid",
    save: "Enregistrer",
    saved: "Paramètres enregistrés.",
    invalid: "Saisissez une URL backend valide."
  },
  de: {
    title: "Atribe Extension Einstellungen",
    body:
      "Konfiguriere die Backend-Basis-URL und die Supporter-User-ID. Die Erweiterung leitet unterstützte Produkt-URLs über das Atribe-Backend statt über einen fest eingebauten Affiliate-Tag.",
    backendLabel: "Atribe Backend-URL",
    backendPlaceholder: "https://dein-backend.example.com",
    userLabel: "Supporter-User-ID",
    userPlaceholder: "uuid",
    save: "Einstellungen speichern",
    saved: "Einstellungen gespeichert.",
    invalid: "Gültige Backend-URL eingeben."
  },
  it: {
    title: "Impostazioni estensione Atribe",
    body:
      "Configura l’URL base del backend e l’id utente supporter. L’estensione instraderà gli URL prodotto supportati tramite il backend Atribe invece di applicare un tag affiliato fisso.",
    backendLabel: "URL backend Atribe",
    backendPlaceholder: "https://tuo-backend.example.com",
    userLabel: "Id utente supporter",
    userPlaceholder: "uuid",
    save: "Salva impostazioni",
    saved: "Impostazioni salvate.",
    invalid: "Inserisci un URL backend valido."
  }
};

function getLocalizedCopy() {
  const language = String(navigator.language || "en").toLowerCase().split("-")[0];
  return copy[language] || copy.en;
}

function applyLocalizedCopy() {
  const localizedCopy = getLocalizedCopy();

  document.documentElement.lang = String(navigator.language || "en");
  document.title = localizedCopy.title;
  document.getElementById("title").textContent = localizedCopy.title;
  document.getElementById("body").textContent = localizedCopy.body;
  document.getElementById("backend-label").childNodes[0].textContent = localizedCopy.backendLabel;
  document.getElementById("user-label").childNodes[0].textContent = localizedCopy.userLabel;
  backendUrlInput.placeholder = localizedCopy.backendPlaceholder;
  userIdInput.placeholder = localizedCopy.userPlaceholder;
  document.getElementById("save-button").textContent = localizedCopy.save;
}

function normalizeBaseUrl(value) {
  const normalized = String(value || "").trim().replace(/\/+$/, "");

  if (!normalized) {
    return "";
  }

  try {
    return new URL(normalized).toString().replace(/\/+$/, "");
  } catch {
    throw new Error(getLocalizedCopy().invalid);
  }
}

function loadSettings() {
  chrome.storage.sync.get([CONFIG_KEYS.backendBaseUrl, CONFIG_KEYS.userId], (result) => {
    backendUrlInput.value = result?.[CONFIG_KEYS.backendBaseUrl] || "";
    userIdInput.value = result?.[CONFIG_KEYS.userId] || "";
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    const backendBaseUrl = normalizeBaseUrl(backendUrlInput.value);
    const userId = String(userIdInput.value || "").trim();

    chrome.storage.sync.set(
      {
        [CONFIG_KEYS.backendBaseUrl]: backendBaseUrl,
        [CONFIG_KEYS.userId]: userId
      },
      () => {
        statusNode.textContent = getLocalizedCopy().saved;
      }
    );
  } catch (error) {
    statusNode.textContent = error.message;
  }
});

applyLocalizedCopy();
loadSettings();
