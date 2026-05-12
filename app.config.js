const fs = require("fs");
const path = require("path");

const clientDir = path.join(__dirname, "apps", "client");
const clientConfig = require("./apps/client/app.config.js");

function loadClientEnvFile(fileName) {
  const envPath = path.join(clientDir, fileName);

  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function prefixClientAsset(assetPath) {
  if (!assetPath || !assetPath.startsWith("./assets/")) {
    return assetPath;
  }

  return `./apps/client/${assetPath.slice(2)}`;
}

function rewriteClientAssetPaths(config) {
  return {
    ...config,
    icon: prefixClientAsset(config.icon),
    splash: config.splash
      ? {
          ...config.splash,
          image: prefixClientAsset(config.splash.image)
        }
      : config.splash,
    android: config.android
      ? {
          ...config.android,
          adaptiveIcon: config.android.adaptiveIcon
            ? {
                ...config.android.adaptiveIcon,
                foregroundImage: prefixClientAsset(config.android.adaptiveIcon.foregroundImage)
              }
            : config.android.adaptiveIcon
        }
      : config.android,
    web: config.web
      ? {
          ...config.web,
          favicon: prefixClientAsset(config.web.favicon)
        }
      : config.web
  };
}

module.exports = (props) => {
  loadClientEnvFile(".env.local");
  loadClientEnvFile(".env");

  return rewriteClientAssetPaths(clientConfig(props));
};
