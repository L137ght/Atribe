import { createClient } from "@supabase/supabase-js";

import { env } from "../config/env.js";

let supabaseClient = null;

export const getSupabase = () => {
  if (env.dbProvider !== "supabase") {
    throw new Error("Supabase client requested while DB_PROVIDER is not set to supabase.");
  }

  if (!supabaseClient) {
    supabaseClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }

  return supabaseClient;
};
