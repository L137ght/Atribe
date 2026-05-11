import { env } from "../config/env.js";
import { db } from "./database.js";
import { getSupabase } from "./supabase.js";
import { logger } from "../utils/logger.js";

const REQUIRED_TABLES = ["share_links", "support_scores", "creator_rewards"];

async function checkSupabaseTables() {
  const supabase = getSupabase();

  for (const tableName of REQUIRED_TABLES) {
    const { error } = await supabase.from(tableName).select("id").limit(1);
    if (error) {
      throw new Error(`Support feature storage check failed for ${tableName}: ${error.message}`);
    }
  }
}

function checkSqliteTables() {
  for (const tableName of REQUIRED_TABLES) {
    db.prepare(`SELECT 1 FROM ${tableName} LIMIT 1`).get();
  }
}

export async function verifySupportFeatureStorage() {
  if (env.nodeEnv === "production") {
    return;
  }

  if (env.dbProvider === "supabase") {
    await checkSupabaseTables();
  } else {
    checkSqliteTables();
  }

  logger.info("Verified support feature storage", {
    dbProvider: env.dbProvider,
    tables: REQUIRED_TABLES,
  });
}
