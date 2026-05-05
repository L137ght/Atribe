const CONFIG_KEYS = {
  backendBaseUrl: "atribeBackendBaseUrl",
  userId: "atribeUserId"
};

const backendUrlInput = document.getElementById("backend-url");
const userIdInput = document.getElementById("user-id");
const statusNode = document.getElementById("status");
const form = document.getElementById("settings-form");

function normalizeBaseUrl(value) {
  const normalized = String(value || "").trim().replace(/\/+$/, "");

  if (!normalized) {
    return "";
  }

  try {
    return new URL(normalized).toString().replace(/\/+$/, "");
  } catch {
    throw new Error("Enter a valid backend URL.");
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
        statusNode.textContent = "Settings saved.";
      }
    );
  } catch (error) {
    statusNode.textContent = error.message;
  }
});

loadSettings();
