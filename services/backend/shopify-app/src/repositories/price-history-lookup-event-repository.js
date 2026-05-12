import crypto from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { insertRow } from "./supabase/shared.js";

export const priceHistoryLookupEventRepository = {
  async create({
    requestedUrl,
    normalizedUrl,
    productId,
    status,
    provider,
    attemptedProviders = [],
    errorCode,
    elapsedMs,
    cacheStatus
  }) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    if (env.dbProvider === "supabase") {
      await insertRow("price_history_lookup_events", {
        id,
        requested_url: requestedUrl,
        normalized_url: normalizedUrl || null,
        product_id: productId || null,
        status,
        provider: provider || null,
        attempted_providers: attemptedProviders,
        error_code: errorCode || null,
        elapsed_ms: elapsedMs ?? null,
        cache_status: cacheStatus || null,
        created_at: createdAt
      });

      return { id, createdAt };
    }

    const statement = db.prepare(`
      INSERT INTO price_history_lookup_events (
        id, requested_url, normalized_url, product_id, status, provider,
        attempted_providers_json, error_code, elapsed_ms, cache_status, created_at
      )
      VALUES (
        @id, @requestedUrl, @normalizedUrl, @productId, @status, @provider,
        @attemptedProvidersJson, @errorCode, @elapsedMs, @cacheStatus, @createdAt
      )
    `);

    statement.run({
      id,
      requestedUrl,
      normalizedUrl: normalizedUrl || null,
      productId: productId || null,
      status,
      provider: provider || null,
      attemptedProvidersJson: JSON.stringify(attemptedProviders || []),
      errorCode: errorCode || null,
      elapsedMs: elapsedMs ?? null,
      cacheStatus: cacheStatus || null,
      createdAt
    });

    return { id, createdAt };
  }
};
