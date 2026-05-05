import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { env } from "../config/env.js";

const resolveDatabasePath = () => {
  if (path.isAbsolute(env.sqliteDbPath)) {
    return env.sqliteDbPath;
  }

  return path.resolve(process.cwd(), env.sqliteDbPath);
};

const databasePath = resolveDatabasePath();
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);

const tableColumns = (tableName) => {
  const statement = db.prepare(`PRAGMA table_info(${tableName})`);
  return statement.all().map((column) => column.name);
};

const hasTable = (tableName) => {
  const statement = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `);

  return Boolean(statement.get(tableName));
};

const hasColumn = (tableName, columnName) =>
  hasTable(tableName) && tableColumns(tableName).includes(columnName);

const ensureColumn = (tableName, columnName, definition) => {
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const recreateTable = ({ tableName, createSql, copySql }) => {
  db.exec("BEGIN");

  try {
    db.exec(`ALTER TABLE ${tableName} RENAME TO ${tableName}_legacy_backup`);
    db.exec(createSql);
    db.exec(copySql);
    db.exec(`DROP TABLE ${tableName}_legacy_backup`);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};

db.exec(`
  CREATE TABLE IF NOT EXISTS brand_integrations (
    shop_domain TEXT PRIMARY KEY,
    brand_id TEXT,
    shop_name TEXT,
    integration_status TEXT NOT NULL DEFAULT 'active',
    default_commission_rate REAL,
    installed_at TEXT,
    uninstalled_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS creator_brand_links (
    id TEXT PRIMARY KEY,
    brand_id TEXT,
    shop_domain TEXT,
    creator_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    default_commission_rate REAL,
    coupon_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS shops (
    shop_domain TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    scope TEXT,
    installed_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS shop_script_tags (
    shop_domain TEXT PRIMARY KEY,
    script_tag_id TEXT NOT NULL,
    src TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(shop_domain) REFERENCES shops(shop_domain)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS shop_webhook_registrations (
    shop_domain TEXT NOT NULL,
    topic TEXT NOT NULL,
    webhook_id TEXT NOT NULL,
    callback_url TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY(shop_domain, topic),
    FOREIGN KEY(shop_domain) REFERENCES shops(shop_domain)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT,
    created_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS creators (
    id TEXT PRIMARY KEY,
    name TEXT,
    external_tags_json TEXT,
    created_at TEXT NOT NULL
  );
`);

ensureColumn("creators", "external_tags_json", "TEXT");
ensureColumn("brand_integrations", "default_commission_rate", "REAL");
ensureColumn("creator_brand_links", "default_commission_rate", "REAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS user_creator_weights (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    weight REAL NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    attributed_value_total REAL NOT NULL DEFAULT 0,
    commission_value_total REAL NOT NULL DEFAULT 0,
    event_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, creator_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(creator_id) REFERENCES creators(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS click_weight_snapshots (
    id TEXT PRIMARY KEY,
    click_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    link_id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    brand_id TEXT NOT NULL,
    destination_url TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

if (hasTable("link_clicks") && !hasColumn("link_clicks", "user_id")) {
  recreateTable({
    tableName: "link_clicks",
    createSql: `
      CREATE TABLE IF NOT EXISTS link_clicks (
        click_id TEXT PRIMARY KEY,
        link_id TEXT,
        creator_id TEXT,
        selected_creator_id TEXT,
        user_id TEXT,
        destination_url TEXT,
        platform_type TEXT,
        brand_id TEXT,
        shop_domain TEXT,
        snapshot_id TEXT,
        fallback_reason TEXT,
        clicked_at TEXT NOT NULL,
        ip_hash TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        FOREIGN KEY(link_id) REFERENCES links(link_id),
        FOREIGN KEY(snapshot_id) REFERENCES click_weight_snapshots(id)
      );
    `,
    copySql: `
      INSERT INTO link_clicks (
        click_id,
        link_id,
        creator_id,
        selected_creator_id,
        user_id,
        destination_url,
        platform_type,
        brand_id,
        shop_domain,
        snapshot_id,
        fallback_reason,
        clicked_at,
        ip_hash,
        user_agent
      )
      SELECT
        click_id,
        link_id,
        creator_id,
        creator_id,
        NULL,
        NULL,
        'legacy_single_creator',
        NULL,
        NULL,
        NULL,
        NULL,
        clicked_at,
        ip_hash,
        user_agent
      FROM link_clicks_legacy_backup
    `
  });
} else {
  db.exec(`
    CREATE TABLE IF NOT EXISTS link_clicks (
      click_id TEXT PRIMARY KEY,
      link_id TEXT,
      creator_id TEXT,
      selected_creator_id TEXT,
      user_id TEXT,
      destination_url TEXT,
      platform_type TEXT,
      brand_id TEXT,
      shop_domain TEXT,
      snapshot_id TEXT,
      fallback_reason TEXT,
      clicked_at TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      user_agent TEXT NOT NULL,
      FOREIGN KEY(link_id) REFERENCES links(link_id),
      FOREIGN KEY(snapshot_id) REFERENCES click_weight_snapshots(id)
    );
  `);
}

ensureColumn("link_clicks", "fallback_reason", "TEXT");

db.exec(`
  CREATE TABLE IF NOT EXISTS creator_coupon_mappings (
    coupon_code TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS shopify_orders (
    order_id TEXT NOT NULL,
    shop_domain TEXT NOT NULL,
    total_price TEXT NOT NULL,
    currency TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(order_id, shop_domain)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS shopify_campaigns (
    id TEXT PRIMARY KEY,
    brand_id TEXT,
    shop_domain TEXT NOT NULL,
    name TEXT NOT NULL,
    shopper_offer_type TEXT,
    shopper_offer_value TEXT,
    commission_rate REAL NOT NULL,
    starts_at TEXT,
    ends_at TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

if (hasTable("order_attributions") && !hasColumn("order_attributions", "user_id")) {
  recreateTable({
    tableName: "order_attributions",
    createSql: `
      CREATE TABLE IF NOT EXISTS order_attributions (
        order_id TEXT NOT NULL,
        shop_domain TEXT NOT NULL,
        creator_id TEXT,
        user_id TEXT,
        platform_type TEXT,
        attribution_source TEXT NOT NULL,
        order_value TEXT NOT NULL,
        currency TEXT,
        click_id TEXT,
        snapshot_id TEXT,
        fallback_reason TEXT,
        atribe_ref TEXT,
        coupon_code TEXT,
        processed_at TEXT NOT NULL,
        PRIMARY KEY(order_id, shop_domain)
      );
    `,
    copySql: `
      INSERT INTO order_attributions (
        order_id,
        shop_domain,
        creator_id,
        user_id,
        platform_type,
        attribution_source,
        order_value,
        currency,
        click_id,
        snapshot_id,
        fallback_reason,
        atribe_ref,
        coupon_code,
        processed_at
      )
      SELECT
        order_id,
        shop_domain,
        creator_id,
        NULL,
        'legacy_single_creator',
        attribution_source,
        order_value,
        NULL,
        click_id,
        NULL,
        NULL,
        atribe_ref,
        coupon_code,
        processed_at
      FROM order_attributions_legacy_backup
    `
  });
} else {
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_attributions (
      order_id TEXT NOT NULL,
      shop_domain TEXT NOT NULL,
      creator_id TEXT,
      user_id TEXT,
      platform_type TEXT,
      attribution_source TEXT NOT NULL,
      order_value TEXT NOT NULL,
      currency TEXT,
      click_id TEXT,
      snapshot_id TEXT,
      fallback_reason TEXT,
      atribe_ref TEXT,
      coupon_code TEXT,
      processed_at TEXT NOT NULL,
      PRIMARY KEY(order_id, shop_domain)
    );
  `);
}

ensureColumn("order_attributions", "fallback_reason", "TEXT");

db.exec(`
  CREATE TABLE IF NOT EXISTS order_commissions (
    commission_key TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    shop_domain TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    user_id TEXT,
    snapshot_id TEXT,
    event_type TEXT NOT NULL,
    order_value TEXT NOT NULL,
    currency TEXT,
    commission_rate REAL NOT NULL,
    creator_commission TEXT NOT NULL,
    platform_fee TEXT NOT NULL,
    status TEXT NOT NULL,
    reference_id TEXT,
    created_at TEXT NOT NULL
  );
`);

ensureColumn("order_commissions", "user_id", "TEXT");
ensureColumn("order_commissions", "snapshot_id", "TEXT");
ensureColumn("order_commissions", "currency", "TEXT");
