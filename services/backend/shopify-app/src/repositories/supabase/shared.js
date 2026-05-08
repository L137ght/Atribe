import { getSupabase } from "../../db/supabase.js";

const buildSelectQuery = (tableName, columns, filters = {}) => {
  let query = getSupabase().from(tableName).select(columns);

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) {
      continue;
    }

    query = value === null ? query.is(key, null) : query.eq(key, value);
  }

  return query;
};

export const fetchOne = async (tableName, columns, filters = {}) => {
  const { data, error } = await buildSelectQuery(tableName, columns, filters).maybeSingle();

  if (error) {
    throw new Error(`Supabase read failed for ${tableName}: ${error.message}`);
  }

  return data || null;
};

export const fetchMany = async ({
  tableName,
  columns,
  filters = {},
  orderBy = null,
  ascending = false,
  limit = null
}) => {
  let query = buildSelectQuery(tableName, columns, filters);

  if (orderBy) {
    query = query.order(orderBy, { ascending });
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Supabase read failed for ${tableName}: ${error.message}`);
  }

  return data || [];
};

export const insertRow = async (tableName, payload) => {
  const { error } = await getSupabase().from(tableName).insert(payload);
  if (error) {
    throw new Error(`Supabase insert failed for ${tableName}: ${error.message}`);
  }
};

export const upsertRow = async (tableName, payload, onConflict) => {
  const { error } = await getSupabase().from(tableName).upsert(payload, {
    onConflict,
    ignoreDuplicates: false
  });

  if (error) {
    throw new Error(`Supabase upsert failed for ${tableName}: ${error.message}`);
  }
};

export const deleteRows = async (tableName, filters = {}) => {
  let query = getSupabase().from(tableName).delete();
  for (const [key, value] of Object.entries(filters)) {
    query = value === null ? query.is(key, null) : query.eq(key, value);
  }

  const { error } = await query;
  if (error) {
    throw new Error(`Supabase delete failed for ${tableName}: ${error.message}`);
  }
};
