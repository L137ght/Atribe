/**
 * Shared environment configuration.
 * Loaded by ALL services. Does NOT require Shopify credentials.
 * Shopify-specific config lives in ./shopify-env.js.
 */
import dotenv from "dotenv";

dotenv.config();

const dbProvider = process.env.DB_PROVIDER || "sqlite";

if (!["sqlite", "supabase"].includes(dbProvider)) {
  throw new Error("DB_PROVIDER must be either 'sqlite' or 'supabase'.");
}

if (dbProvider === "supabase") {
  for (const v of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[v]) {
      throw new Error(`Missing required environment variable for Supabase mode: ${v}`);
    }
  }
}

const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");
const normalizeOptionalUrl = (value) => {
  const n = String(value || "").trim();
  return n ? normalizeBaseUrl(n) : null;
};
const parseOptionalCsv = (value) =>
  String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const sharedEnv = {
  dbProvider,
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || "localhost",
  logLevel: process.env.LOG_LEVEL || "debug",
  atribeBaseUrl: normalizeBaseUrl(process.env.ATRIBE_BASE_URL || ""),
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
