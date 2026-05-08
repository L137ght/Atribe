import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchOne } from "./supabase/shared.js";

export const userRepository = {
  async findById(userId) {
    if (env.dbProvider === "supabase") {
      try {
        const row = await fetchOne("profiles", "id, email, created_at", { id: userId });
        if (row) {
          return {
            id: row.id,
            email: row.email,
            createdAt: row.created_at
          };
        }
      } catch {}

      try {
        const { data, error } = await getSupabase()
          .schema("auth")
          .from("users")
          .select("id, email, created_at")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          return {
              id: data.id,
              email: data.email,
              createdAt: data.created_at
            };
        }
      } catch {
      }

      try {
        const row = await fetchOne("shopify_users", "id, email, created_at", { id: userId });
        if (row) {
          return {
            id: row.id,
            email: row.email,
            createdAt: row.created_at
          };
        }
      } catch {}

      try {
        const { data, error } = await getSupabase()
          .from("shopify_supporter_creator_weights")
          .select("user_id")
          .eq("user_id", userId)
          .limit(1);

        if (error) {
          throw error;
        }

        if (Array.isArray(data) && data.length > 0) {
          return {
            id: userId,
            email: null,
            createdAt: null
          };
        }
      } catch {}

      return null;
    }

    const statement = db.prepare(`
      SELECT id, email, created_at AS createdAt
      FROM users
      WHERE id = ?
    `);

    return statement.get(userId) || null;
  },

  async upsert({ id, email = null }) {
    if (env.dbProvider === "supabase") {
      const existing = await this.findById(id);
      if (existing) {
        return existing;
      }

      const supabase = getSupabase();
      const payload = {
        id,
        email,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("shopify_users")
        .upsert(payload, {
          onConflict: "id",
          ignoreDuplicates: false
        });

      if (error) {
        throw new Error(`Supabase upsert failed for shopify_users: ${error.message}`);
      }

      return this.findById(id);
    }

    const statement = db.prepare(`
      INSERT INTO users (id, email, created_at)
      VALUES (@id, @email, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email
    `);

    statement.run({
      id,
      email,
      createdAt: new Date().toISOString()
    });

    return this.findById(id);
  }
};
