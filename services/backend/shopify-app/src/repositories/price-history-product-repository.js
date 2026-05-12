import crypto from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../db/database.js";
import { getSupabase } from "../db/supabase.js";
import { fetchOne } from "./supabase/shared.js";

const mapRow = (row) =>
  row
    ? {
        id: row.id,
        marketplace: row.marketplace,
        productId: row.product_id ?? row.productId ?? null,
        canonicalUrl: row.canonical_url ?? row.canonicalUrl ?? null,
        resolvedUrl: row.resolved_url ?? row.resolvedUrl ?? null,
        title: row.title ?? null,
        imageUrl: row.image_url ?? row.imageUrl ?? null,
        providerPageUrl: row.provider_page_url ?? row.providerPageUrl ?? null,
        firstSeenAt: row.first_seen_at ?? row.firstSeenAt,
        lastSeenAt: row.last_seen_at ?? row.lastSeenAt
      }
    : null;

export const priceHistoryProductRepository = {
  async findByIdentity({ marketplace, productId, canonicalUrl }) {
    if (env.dbProvider === "supabase") {
      if (productId) {
        return mapRow(
          await fetchOne(
            "price_history_products",
            "id, marketplace, product_id, canonical_url, resolved_url, title, image_url, provider_page_url, first_seen_at, last_seen_at",
            { marketplace, product_id: productId }
          )
        );
      }

      if (!canonicalUrl) {
        return null;
      }

      return mapRow(
        await fetchOne(
          "price_history_products",
          "id, marketplace, product_id, canonical_url, resolved_url, title, image_url, provider_page_url, first_seen_at, last_seen_at",
          { marketplace, canonical_url: canonicalUrl }
        )
      );
    }

    if (productId) {
      const statement = db.prepare(`
        SELECT
          id, marketplace, product_id AS productId, canonical_url AS canonicalUrl,
          resolved_url AS resolvedUrl, title, image_url AS imageUrl,
          provider_page_url AS providerPageUrl, first_seen_at AS firstSeenAt,
          last_seen_at AS lastSeenAt
        FROM price_history_products
        WHERE marketplace = ? AND product_id = ?
      `);

      return mapRow(statement.get(marketplace, productId));
    }

    if (!canonicalUrl) {
      return null;
    }

    const statement = db.prepare(`
      SELECT
        id, marketplace, product_id AS productId, canonical_url AS canonicalUrl,
        resolved_url AS resolvedUrl, title, image_url AS imageUrl,
        provider_page_url AS providerPageUrl, first_seen_at AS firstSeenAt,
        last_seen_at AS lastSeenAt
      FROM price_history_products
      WHERE marketplace = ? AND canonical_url = ?
    `);

    return mapRow(statement.get(marketplace, canonicalUrl));
  },

  async upsert({
    marketplace,
    productId,
    canonicalUrl,
    resolvedUrl,
    title,
    imageUrl,
    providerPageUrl
  }) {
    const now = new Date().toISOString();
    const existing = await this.findByIdentity({ marketplace, productId, canonicalUrl });

    if (env.dbProvider === "supabase") {
      const supabase = getSupabase();

      if (existing) {
        const { error } = await supabase
          .from("price_history_products")
          .update({
            canonical_url: canonicalUrl || existing.canonicalUrl || null,
            resolved_url: resolvedUrl || existing.resolvedUrl || null,
            title: title || existing.title || null,
            image_url: imageUrl || existing.imageUrl || null,
            provider_page_url: providerPageUrl || existing.providerPageUrl || null,
            last_seen_at: now
          })
          .eq("id", existing.id);

        if (error) {
          throw new Error(`Supabase update failed for price_history_products: ${error.message}`);
        }

        return this.findByIdentity({ marketplace, productId, canonicalUrl });
      }

      const id = crypto.randomUUID();
      const { error } = await supabase.from("price_history_products").insert({
        id,
        marketplace,
        product_id: productId || null,
        canonical_url: canonicalUrl || null,
        resolved_url: resolvedUrl || null,
        title: title || null,
        image_url: imageUrl || null,
        provider_page_url: providerPageUrl || null,
        first_seen_at: now,
        last_seen_at: now
      });

      if (error) {
        throw new Error(`Supabase insert failed for price_history_products: ${error.message}`);
      }

      return this.findByIdentity({ marketplace, productId, canonicalUrl });
    }

    if (existing) {
      const statement = db.prepare(`
        UPDATE price_history_products
        SET
          canonical_url = COALESCE(@canonicalUrl, canonical_url),
          resolved_url = COALESCE(@resolvedUrl, resolved_url),
          title = COALESCE(@title, title),
          image_url = COALESCE(@imageUrl, image_url),
          provider_page_url = COALESCE(@providerPageUrl, provider_page_url),
          last_seen_at = @now
        WHERE id = @id
      `);

      statement.run({
        id: existing.id,
        canonicalUrl: canonicalUrl || null,
        resolvedUrl: resolvedUrl || null,
        title: title || null,
        imageUrl: imageUrl || null,
        providerPageUrl: providerPageUrl || null,
        now
      });

      return this.findByIdentity({ marketplace, productId, canonicalUrl });
    }

    const id = crypto.randomUUID();
    const statement = db.prepare(`
      INSERT INTO price_history_products (
        id, marketplace, product_id, canonical_url, resolved_url, title,
        image_url, provider_page_url, first_seen_at, last_seen_at
      )
      VALUES (
        @id, @marketplace, @productId, @canonicalUrl, @resolvedUrl, @title,
        @imageUrl, @providerPageUrl, @now, @now
      )
    `);

    statement.run({
      id,
      marketplace,
      productId: productId || null,
      canonicalUrl: canonicalUrl || null,
      resolvedUrl: resolvedUrl || null,
      title: title || null,
      imageUrl: imageUrl || null,
      providerPageUrl: providerPageUrl || null,
      now
    });

    return this.findByIdentity({ marketplace, productId, canonicalUrl });
  }
};
