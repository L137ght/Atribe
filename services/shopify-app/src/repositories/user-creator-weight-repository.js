import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";

const now = () => new Date().toISOString();
const isMissingRelationError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("could not find the table") ||
    message.includes("relation") ||
    message.includes("schema cache")
  );
};

const toMergedWeightRow = (weightRow, ledgerRow) => ({
  id: weightRow.id || `${weightRow.user_id}:${weightRow.creator_id}`,
  userId: weightRow.user_id,
  creatorId: weightRow.creator_id,
  weight: Number(weightRow.weight || 0),
  active: weightRow.active === undefined ? 1 : weightRow.active,
  attributedValueTotal: Number(ledgerRow?.attributed_value_total || 0),
  commissionValueTotal: Number(ledgerRow?.commission_value_total || 0),
  eventCount: Number(ledgerRow?.event_count || 0),
  createdAt: weightRow.created_at || null,
  updatedAt: ledgerRow?.updated_at || weightRow.updated_at || weightRow.created_at || null
});

const normalizeSupabaseWeightRows = (rows, { assumeActive = false } = {}) =>
  (rows || []).map((row) => ({
    id: row.id || `${row.user_id}:${row.creator_id}`,
    user_id: row.user_id,
    creator_id: row.creator_id,
    weight: row.weight,
    active: row.active === undefined ? assumeActive : row.active,
    created_at: row.created_at || null,
    updated_at: row.updated_at || row.created_at || null
  }));

const readTableRows = async ({ tableName, selectColumns, userId, activeColumn = null }) => {
  const supabase = getSupabase();
  let query = supabase
    .from(tableName)
    .select(selectColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (activeColumn) {
    query = query.eq(activeColumn, true);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data || [];
};

const readSupabaseUserCreators = async (userId) => {
  const candidates = [
    {
      tableName: "tribe_memberships",
      selectColumns: "id, user_id, creator_profile_id, weight, selected, created_at, updated_at",
      activeColumn: "selected",
      assumeActive: false,
      transformRows: (rows) =>
        normalizeSupabaseWeightRows(
          (rows || []).map((row) => ({
            id: row.id,
            user_id: row.user_id,
            creator_id: row.creator_profile_id,
            weight: row.weight,
            active: row.selected,
            created_at: row.created_at,
            updated_at: row.updated_at
          }))
        )
    },
    {
      tableName: "user_creators",
      selectColumns: "id, user_id, creator_id, weight, active, created_at, updated_at",
      activeColumn: "active",
      assumeActive: false
    },
    {
      tableName: "user_creators",
      selectColumns: "id, user_id, creator_id, weight, created_at, updated_at",
      activeColumn: null,
      assumeActive: true
    },
    {
      tableName: "user_creator_weights",
      selectColumns: "id, user_id, creator_id, weight, active, created_at, updated_at",
      activeColumn: "active",
      assumeActive: false
    },
    {
      tableName: "shopify_supporter_creator_weights",
      selectColumns: "id, user_id, creator_id, weight, active, created_at, updated_at",
      activeColumn: "active",
      assumeActive: false
    }
  ];

  let lastError = null;

  for (const candidate of candidates) {
    try {
      const rows = await readTableRows({
        tableName: candidate.tableName,
        selectColumns: candidate.selectColumns,
        userId,
        activeColumn: candidate.activeColumn
      });

      return candidate.transformRows
        ? candidate.transformRows(rows)
        : normalizeSupabaseWeightRows(rows, {
            assumeActive: candidate.assumeActive
          });
    } catch (error) {
      lastError = error;
      if (!isMissingRelationError(error)) {
        throw new Error(`Supabase read failed for public.${candidate.tableName}: ${error.message}`);
      }
    }
  }

  if (lastError) {
    throw new Error(
      "No supporter weight source is available. Expected one of: public.user_creators, public.user_creator_weights, public.shopify_supporter_creator_weights."
    );
  }

  return [];
};

export const userCreatorWeightRepository = {
  async findActiveByUserId(userId) {
    if (env.dbProvider === "supabase") {
      const supabase = getSupabase();
      const weights = await readSupabaseUserCreators(userId);
      const { data: ledgerRows, error: ledgerError } = await supabase
        .from("shopify_user_creator_ledger")
        .select("user_id, creator_id, attributed_value_total, commission_value_total, event_count, updated_at")
        .eq("user_id", userId);

      if (ledgerError) {
        throw new Error(`Supabase read failed for shopify_user_creator_ledger: ${ledgerError.message}`);
      }

      const ledgerByCreatorId = new Map(
        (ledgerRows || []).map((row) => [row.creator_id, row])
      );

      return weights.map((weightRow) => toMergedWeightRow(weightRow, ledgerByCreatorId.get(weightRow.creator_id)));
    }

    const statement = db.prepare(`
      SELECT
        id,
        user_id AS userId,
        creator_id AS creatorId,
        weight,
        active,
        attributed_value_total AS attributedValueTotal,
        commission_value_total AS commissionValueTotal,
        event_count AS eventCount,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM user_creator_weights
      WHERE user_id = ? AND active = 1
      ORDER BY created_at ASC
    `);

    return statement.all(userId);
  },

  async incrementPerformance({
    userId,
    creatorId,
    attributedValueIncrement = 0,
    commissionValueIncrement = 0,
    eventCountIncrement = 0
  }) {
    if (env.dbProvider === "supabase") {
      const supabase = getSupabase();
      const { data: existing, error: readError } = await supabase
        .from("shopify_user_creator_ledger")
        .select("id, user_id, creator_id, attributed_value_total, commission_value_total, event_count")
        .eq("user_id", userId)
        .eq("creator_id", creatorId)
        .maybeSingle();

      if (readError) {
        throw new Error(`Supabase read failed for shopify_user_creator_ledger: ${readError.message}`);
      }

      const payload = {
        id: existing?.id,
        user_id: userId,
        creator_id: creatorId,
        attributed_value_total: Number(existing?.attributed_value_total || 0) + Number(attributedValueIncrement || 0),
        commission_value_total: Number(existing?.commission_value_total || 0) + Number(commissionValueIncrement || 0),
        event_count: Number(existing?.event_count || 0) + Number(eventCountIncrement || 0),
        updated_at: now()
      };

      const { error } = await supabase
        .from("shopify_user_creator_ledger")
        .upsert(payload, {
          onConflict: "user_id,creator_id",
          ignoreDuplicates: false
        });

      if (error) {
        throw new Error(`Supabase upsert failed for shopify_user_creator_ledger: ${error.message}`);
      }

      return;
    }

    const statement = db.prepare(`
      UPDATE user_creator_weights
      SET
        attributed_value_total = attributed_value_total + @attributedValueIncrement,
        commission_value_total = commission_value_total + @commissionValueIncrement,
        event_count = event_count + @eventCountIncrement,
        updated_at = @updatedAt
      WHERE user_id = @userId AND creator_id = @creatorId
    `);

    statement.run({
      userId,
      creatorId,
      attributedValueIncrement,
      commissionValueIncrement,
      eventCountIncrement,
      updatedAt: now()
    });
  },

  async upsert({
    id,
    userId,
    creatorId,
    weight,
    active = true,
    attributedValueTotal = 0,
    commissionValueTotal = 0,
    eventCount = 0
  }) {
    if (env.dbProvider === "supabase") {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("shopify_supporter_creator_weights")
        .upsert(
          {
            id,
            user_id: userId,
            creator_id: creatorId,
            weight,
            active,
            created_at: now(),
            updated_at: now()
          },
          {
            onConflict: "user_id,creator_id",
            ignoreDuplicates: false
          }
        );

      if (error) {
        throw new Error(`Supabase upsert failed for shopify_supporter_creator_weights: ${error.message}`);
      }

      return;
    }

    const statement = db.prepare(`
      INSERT INTO user_creator_weights (
        id,
        user_id,
        creator_id,
        weight,
        active,
        attributed_value_total,
        commission_value_total,
        event_count,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @userId,
        @creatorId,
        @weight,
        @active,
        @attributedValueTotal,
        @commissionValueTotal,
        @eventCount,
        @createdAt,
        @updatedAt
      )
      ON CONFLICT(user_id, creator_id) DO UPDATE SET
        weight = excluded.weight,
        active = excluded.active,
        updated_at = excluded.updated_at
    `);

    const timestamp = now();
    statement.run({
      id,
      userId,
      creatorId,
      weight,
      active: active ? 1 : 0,
      attributedValueTotal,
      commissionValueTotal,
      eventCount,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }
};
