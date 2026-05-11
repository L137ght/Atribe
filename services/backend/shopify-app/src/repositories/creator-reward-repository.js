import crypto from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchOne, fetchMany } from "./supabase/shared.js";

const mapCreatorReward = (row) =>
  row
    ? {
        id: row.id,
        creatorId: row.creator_id,
        title: row.title,
        description: row.description,
        rewardType: row.reward_type,
        requiredPoints: row.required_points,
        deliveryType: row.delivery_type,
        destinationUrl: row.destination_url,
        isActive: row.is_active,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;

export const creatorRewardRepository = {
  async create({ creatorId, title, description, rewardType, requiredPoints, deliveryType, destinationUrl, isActive }) {
    const now = new Date().toISOString();

    if (env.dbProvider === "supabase") {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("creator_rewards")
        .insert({
          creator_id: creatorId,
          title,
          description: description || null,
          reward_type: rewardType,
          required_points: requiredPoints,
          delivery_type: deliveryType || "external_url",
          destination_url: destinationUrl || null,
          is_active: isActive !== false,
          created_at: now,
          updated_at: now,
        })
        .select("id, creator_id, title, description, reward_type, required_points, delivery_type, destination_url, is_active, starts_at, ends_at, created_at, updated_at")
        .single();

      if (error) {
        throw new Error(`Supabase insert failed for creator_rewards: ${error.message}`);
      }

      return mapCreatorReward(data);
    }

    const id = crypto.randomUUID();
    const statement = db.prepare(`
      INSERT INTO creator_rewards (id, creator_id, title, description, reward_type, required_points, delivery_type, destination_url, is_active, created_at, updated_at)
      VALUES (@id, @creatorId, @title, @description, @rewardType, @requiredPoints, @deliveryType, @destinationUrl, @isActive, @createdAt, @updatedAt)
    `);

    statement.run({
      id,
      creatorId,
      title,
      description: description || null,
      rewardType,
      requiredPoints,
      deliveryType: deliveryType || "external_url",
      destinationUrl: destinationUrl || null,
      isActive: isActive !== false ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    });

    return this.findById(id);
  },

  async findById(id) {
    if (env.dbProvider === "supabase") {
      const row = await fetchOne(
        "creator_rewards",
        "id, creator_id, title, description, reward_type, required_points, delivery_type, destination_url, is_active, starts_at, ends_at, created_at, updated_at",
        { id }
      );

      return mapCreatorReward(row);
    }

    const statement = db.prepare(`
      SELECT
        id, creator_id, title, description, reward_type, required_points,
        delivery_type, destination_url, is_active, starts_at, ends_at,
        created_at, updated_at
      FROM creator_rewards
      WHERE id = ?
    `);

    return mapCreatorReward(statement.get(id));
  },

  async findByCreatorId(creatorId, includeInactive = false) {
    if (env.dbProvider === "supabase") {
      const filters = { creator_id: creatorId };
      if (!includeInactive) {
        filters.is_active = true;
      }

      const rows = await fetchMany({
        tableName: "creator_rewards",
        columns: "id, creator_id, title, description, reward_type, required_points, delivery_type, destination_url, is_active, starts_at, ends_at, created_at, updated_at",
        filters,
        orderBy: "required_points",
        ascending: true,
      });

      return rows.map(mapCreatorReward).filter(Boolean);
    }

    const activeClause = includeInactive ? "" : " AND is_active = 1";
    const statement = db.prepare(`
      SELECT
        id, creator_id, title, description, reward_type, required_points,
        delivery_type, destination_url, is_active, starts_at, ends_at,
        created_at, updated_at
      FROM creator_rewards
      WHERE creator_id = ?${activeClause}
      ORDER BY required_points ASC
    `);

    return statement.all(creatorId).map(mapCreatorReward).filter(Boolean);
  },

  async findNextReward(creatorId, lifetimePoints) {
    if (env.dbProvider === "supabase") {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("creator_rewards")
        .select("id, title, required_points")
        .eq("creator_id", creatorId)
        .eq("is_active", true)
        .gt("required_points", lifetimePoints)
        .order("required_points", { ascending: true })
        .limit(1);

      if (error) {
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return {
        id: data[0].id,
        title: data[0].title,
        requiredPoints: data[0].required_points,
        pointsRemaining: data[0].required_points - lifetimePoints,
      };
    }

    const statement = db.prepare(`
      SELECT id, title, required_points AS requiredPoints
      FROM creator_rewards
      WHERE creator_id = ? AND is_active = 1 AND required_points > ?
      ORDER BY required_points ASC
      LIMIT 1
    `);

    const row = statement.get(creatorId, lifetimePoints);
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      requiredPoints: row.requiredPoints,
      pointsRemaining: row.requiredPoints - lifetimePoints,
    };
  },
};
