const baseConfig = require("./app.json");

module.exports = ({ config }) => {
  const expoConfig = baseConfig.expo || {};

  return {
    ...config,
    ...expoConfig,
    extra: {
      ...(expoConfig.extra || {}),
      atribeBackendUrl:
        process.env.EXPO_PUBLIC_ATRIBE_BACKEND_URL ||
        process.env.REACT_APP_ATRIBE_BACKEND_URL ||
        "",
      supabasePublishableKey:
        process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY ||
        "",
      supabaseUrl:
        process.env.EXPO_PUBLIC_SUPABASE_URL ||
        process.env.REACT_APP_SUPABASE_URL ||
        ""
    }
  };
};
