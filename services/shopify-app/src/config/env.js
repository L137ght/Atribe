import dotenv from "dotenv";

dotenv.config();

const requiredVariables = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_SCOPES",
  "SHOPIFY_APP_URL",
  "ATRIBE_BASE_URL"
];

for (const variableName of requiredVariables) {
  if (!process.env[variableName]) {
    throw new Error(`Missing required environment variable: ${variableName}`);
  }
}

const dbProvider = process.env.DB_PROVIDER || "sqlite";

if (!["sqlite", "supabase"].includes(dbProvider)) {
  throw new Error("DB_PROVIDER must be either 'sqlite' or 'supabase'.");
}

if (dbProvider === "supabase") {
  for (const variableName of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[variableName]) {
      throw new Error(`Missing required environment variable for Supabase mode: ${variableName}`);
    }
  }
}

const normalizeBaseUrl = (value) => value.replace(/\/+$/, "");
const normalizeOptionalUrl = (value) => {
  const normalized = String(value || "").trim();
  return normalized ? normalizeBaseUrl(normalized) : null;
};
const parseOptionalCsv = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const env = {
  dbProvider,
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || "localhost",
  logLevel: process.env.LOG_LEVEL || "debug",
  atribeBaseUrl: normalizeBaseUrl(process.env.ATRIBE_BASE_URL),
  shopifyApiKey: process.env.SHOPIFY_API_KEY,
  shopifyApiSecret: process.env.SHOPIFY_API_SECRET,
  shopifyScopes: process.env.SHOPIFY_SCOPES.split(",").map((scope) => scope.trim()).filter(Boolean),
  shopifyAppUrl: normalizeBaseUrl(process.env.SHOPIFY_APP_URL),
  shopifyCallbackUrl: normalizeOptionalUrl(process.env.SHOPIFY_CALLBACK_URL),
  shopifyApiVersion: process.env.SHOPIFY_API_VERSION || "2026-04",
  sqliteDbPath: process.env.SQLITE_DB_PATH || "./shopify-app.db",
  supabaseUrl: normalizeOptionalUrl(process.env.SUPABASE_URL),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  corsAllowedOrigins: parseOptionalCsv(process.env.CORS_ALLOWED_ORIGINS),
  defaultCommissionRate: Number(process.env.DEFAULT_COMMISSION_RATE || 0.1),
  platformFeeRate: Number(process.env.PLATFORM_FEE_RATE || 0),
  atribeHouseCreatorId:
    String(process.env.ATRIBE_HOUSE_CREATOR_ID || "").trim() ||
    "00000000-0000-0000-0000-000000000001"
};
