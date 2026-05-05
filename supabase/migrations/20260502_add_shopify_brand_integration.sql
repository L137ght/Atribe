create table if not exists public.shopify_brand_integrations (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid null,
  shop_domain text unique not null,
  shop_name text null,
  integration_status text default 'active',
  installed_at timestamptz null,
  uninstalled_at timestamptz null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.shopify_brand_integrations add column if not exists brand_id uuid null;
alter table public.shopify_brand_integrations add column if not exists shop_name text null;
alter table public.shopify_brand_integrations add column if not exists integration_status text default 'active';
alter table public.shopify_brand_integrations add column if not exists installed_at timestamptz null;
alter table public.shopify_brand_integrations add column if not exists uninstalled_at timestamptz null;
alter table public.shopify_brand_integrations add column if not exists created_at timestamptz default now();
alter table public.shopify_brand_integrations add column if not exists updated_at timestamptz default now();

create table if not exists public.shopify_shops (
  id uuid primary key default gen_random_uuid(),
  shop_domain text unique not null,
  access_token text,
  scopes text,
  installed_at timestamptz,
  uninstalled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.shopify_shops add column if not exists access_token text;
alter table public.shopify_shops add column if not exists scopes text;
alter table public.shopify_shops add column if not exists installed_at timestamptz;
alter table public.shopify_shops add column if not exists uninstalled_at timestamptz;
alter table public.shopify_shops add column if not exists created_at timestamptz default now();
alter table public.shopify_shops add column if not exists updated_at timestamptz default now();

create table if not exists public.shopify_script_tags (
  id uuid primary key default gen_random_uuid(),
  shop_domain text not null,
  shopify_script_tag_id text,
  src text,
  display_scope text,
  created_at timestamptz default now()
);

alter table public.shopify_script_tags add column if not exists shopify_script_tag_id text;
alter table public.shopify_script_tags add column if not exists src text;
alter table public.shopify_script_tags add column if not exists display_scope text;
alter table public.shopify_script_tags add column if not exists created_at timestamptz default now();

create table if not exists public.shopify_webhook_registrations (
  id uuid primary key default gen_random_uuid(),
  shop_domain text not null,
  topic text not null,
  callback_url text not null,
  shopify_webhook_id text,
  created_at timestamptz default now()
);

alter table public.shopify_webhook_registrations add column if not exists topic text not null default '';
alter table public.shopify_webhook_registrations add column if not exists callback_url text not null default '';
alter table public.shopify_webhook_registrations add column if not exists shopify_webhook_id text;
alter table public.shopify_webhook_registrations add column if not exists created_at timestamptz default now();

create table if not exists public.shopify_links (
  id uuid primary key default gen_random_uuid(),
  link_id text unique not null,
  creator_id uuid null,
  brand_id uuid null,
  shop_domain text null,
  destination_url text not null,
  tracking_link text,
  link_type text default 'creator_owned',
  created_at timestamptz default now()
);

alter table public.shopify_links add column if not exists creator_id uuid null;
alter table public.shopify_links add column if not exists brand_id uuid null;
alter table public.shopify_links add column if not exists shop_domain text null;
alter table public.shopify_links add column if not exists destination_url text not null default '';
alter table public.shopify_links add column if not exists tracking_link text;
alter table public.shopify_links add column if not exists link_type text default 'creator_owned';
alter table public.shopify_links add column if not exists created_at timestamptz default now();

create table if not exists public.shopify_link_clicks (
  id uuid primary key default gen_random_uuid(),
  click_id text unique not null,
  link_id text null,
  user_id uuid null,
  creator_id uuid null,
  selected_creator_id uuid null,
  destination_url text,
  platform_type text,
  brand_id uuid null,
  shop_domain text null,
  snapshot_id uuid null,
  ip_hash text,
  user_agent text,
  referrer text,
  clicked_at timestamptz default now()
);

alter table public.shopify_link_clicks add column if not exists link_id text null;
alter table public.shopify_link_clicks add column if not exists user_id uuid null;
alter table public.shopify_link_clicks add column if not exists creator_id uuid null;
alter table public.shopify_link_clicks add column if not exists selected_creator_id uuid null;
alter table public.shopify_link_clicks add column if not exists destination_url text;
alter table public.shopify_link_clicks add column if not exists platform_type text;
alter table public.shopify_link_clicks add column if not exists brand_id uuid null;
alter table public.shopify_link_clicks add column if not exists shop_domain text null;
alter table public.shopify_link_clicks add column if not exists snapshot_id uuid null;
alter table public.shopify_link_clicks add column if not exists ip_hash text;
alter table public.shopify_link_clicks add column if not exists user_agent text;
alter table public.shopify_link_clicks add column if not exists referrer text;
alter table public.shopify_link_clicks add column if not exists clicked_at timestamptz default now();

create table if not exists public.shopify_click_weight_snapshots (
  id uuid primary key default gen_random_uuid(),
  click_id text unique not null,
  user_id uuid not null,
  snapshot_json jsonb not null,
  created_at timestamptz default now()
);

alter table public.shopify_click_weight_snapshots add column if not exists user_id uuid not null default gen_random_uuid();
alter table public.shopify_click_weight_snapshots add column if not exists snapshot_json jsonb not null default '[]'::jsonb;
alter table public.shopify_click_weight_snapshots add column if not exists created_at timestamptz default now();

create table if not exists public.shopify_orders (
  id uuid primary key default gen_random_uuid(),
  shop_domain text not null,
  order_id text not null,
  order_value numeric,
  currency text,
  raw_payload jsonb,
  created_at timestamptz default now(),
  unique (shop_domain, order_id)
);

alter table public.shopify_orders add column if not exists order_value numeric;
alter table public.shopify_orders add column if not exists currency text;
alter table public.shopify_orders add column if not exists raw_payload jsonb;
alter table public.shopify_orders add column if not exists created_at timestamptz default now();

create table if not exists public.shopify_order_attributions (
  id uuid primary key default gen_random_uuid(),
  shop_domain text not null,
  order_id text not null,
  creator_id uuid null,
  user_id uuid null,
  brand_id uuid null,
  platform_type text,
  attribution_source text,
  order_value numeric,
  currency text,
  click_id text null,
  snapshot_id uuid null,
  created_at timestamptz default now(),
  unique (shop_domain, order_id)
);

alter table public.shopify_order_attributions add column if not exists creator_id uuid null;
alter table public.shopify_order_attributions add column if not exists user_id uuid null;
alter table public.shopify_order_attributions add column if not exists brand_id uuid null;
alter table public.shopify_order_attributions add column if not exists platform_type text;
alter table public.shopify_order_attributions add column if not exists attribution_source text;
alter table public.shopify_order_attributions add column if not exists order_value numeric;
alter table public.shopify_order_attributions add column if not exists currency text;
alter table public.shopify_order_attributions add column if not exists click_id text null;
alter table public.shopify_order_attributions add column if not exists snapshot_id uuid null;
alter table public.shopify_order_attributions add column if not exists created_at timestamptz default now();

create table if not exists public.shopify_order_commissions (
  id uuid primary key default gen_random_uuid(),
  commission_key text unique,
  shop_domain text not null,
  order_id text not null,
  creator_id uuid not null,
  user_id uuid null,
  brand_id uuid null,
  snapshot_id uuid null,
  commission_type text not null,
  order_value numeric,
  commission_rate numeric,
  amount numeric not null,
  platform_fee numeric default 0,
  currency text,
  status text default 'pending',
  reference_id text,
  created_at timestamptz default now()
);

alter table public.shopify_order_commissions add column if not exists commission_key text unique;
alter table public.shopify_order_commissions add column if not exists user_id uuid null;
alter table public.shopify_order_commissions add column if not exists brand_id uuid null;
alter table public.shopify_order_commissions add column if not exists snapshot_id uuid null;
alter table public.shopify_order_commissions add column if not exists commission_type text not null default 'sale';
alter table public.shopify_order_commissions add column if not exists order_value numeric;
alter table public.shopify_order_commissions add column if not exists commission_rate numeric;
alter table public.shopify_order_commissions add column if not exists amount numeric not null default 0;
alter table public.shopify_order_commissions add column if not exists platform_fee numeric default 0;
alter table public.shopify_order_commissions add column if not exists currency text;
alter table public.shopify_order_commissions add column if not exists status text default 'pending';
alter table public.shopify_order_commissions add column if not exists reference_id text;
alter table public.shopify_order_commissions add column if not exists created_at timestamptz default now();

create table if not exists public.shopify_creator_coupon_mappings (
  id uuid primary key default gen_random_uuid(),
  shop_domain text,
  brand_id uuid null,
  coupon_code text not null,
  creator_id uuid not null,
  created_at timestamptz default now(),
  unique (shop_domain, coupon_code)
);

alter table public.shopify_creator_coupon_mappings add column if not exists brand_id uuid null;
alter table public.shopify_creator_coupon_mappings add column if not exists coupon_code text not null default '';
alter table public.shopify_creator_coupon_mappings add column if not exists creator_id uuid not null default gen_random_uuid();
alter table public.shopify_creator_coupon_mappings add column if not exists created_at timestamptz default now();

create table if not exists public.shopify_user_creator_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  creator_id uuid not null,
  attributed_value_total numeric default 0,
  commission_value_total numeric default 0,
  event_count integer default 0,
  updated_at timestamptz default now(),
  unique (user_id, creator_id)
);

alter table public.shopify_user_creator_ledger add column if not exists attributed_value_total numeric default 0;
alter table public.shopify_user_creator_ledger add column if not exists commission_value_total numeric default 0;
alter table public.shopify_user_creator_ledger add column if not exists event_count integer default 0;
alter table public.shopify_user_creator_ledger add column if not exists updated_at timestamptz default now();

create table if not exists public.shopify_creator_brand_links (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid null,
  shop_domain text null,
  creator_id uuid not null,
  status text default 'active',
  default_commission_rate numeric null,
  coupon_code text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.shopify_creator_brand_links add column if not exists brand_id uuid null;
alter table public.shopify_creator_brand_links add column if not exists shop_domain text null;
alter table public.shopify_creator_brand_links add column if not exists creator_id uuid not null default gen_random_uuid();
alter table public.shopify_creator_brand_links add column if not exists status text default 'active';
alter table public.shopify_creator_brand_links add column if not exists default_commission_rate numeric null;
alter table public.shopify_creator_brand_links add column if not exists coupon_code text null;
alter table public.shopify_creator_brand_links add column if not exists created_at timestamptz default now();
alter table public.shopify_creator_brand_links add column if not exists updated_at timestamptz default now();

create index if not exists idx_shopify_brand_integrations_brand_id on public.shopify_brand_integrations (brand_id);
create index if not exists idx_shopify_brand_integrations_shop_domain on public.shopify_brand_integrations (shop_domain);
create unique index if not exists idx_shopify_script_tags_shop_domain_unique on public.shopify_script_tags (shop_domain);
create unique index if not exists idx_shopify_webhook_registrations_shop_domain_topic_unique on public.shopify_webhook_registrations (shop_domain, topic);
create index if not exists idx_shopify_links_creator_id on public.shopify_links (creator_id);
create index if not exists idx_shopify_links_brand_id on public.shopify_links (brand_id);
create index if not exists idx_shopify_links_shop_domain on public.shopify_links (shop_domain);
create index if not exists idx_shopify_link_clicks_click_id on public.shopify_link_clicks (click_id);
create index if not exists idx_shopify_link_clicks_user_id on public.shopify_link_clicks (user_id);
create index if not exists idx_shopify_link_clicks_selected_creator_id on public.shopify_link_clicks (selected_creator_id);
create index if not exists idx_shopify_link_clicks_shop_domain on public.shopify_link_clicks (shop_domain);
create index if not exists idx_shopify_click_weight_snapshots_click_id on public.shopify_click_weight_snapshots (click_id);
create index if not exists idx_shopify_click_weight_snapshots_user_id on public.shopify_click_weight_snapshots (user_id);
create index if not exists idx_shopify_orders_shop_domain_order_id on public.shopify_orders (shop_domain, order_id);
create index if not exists idx_shopify_order_attributions_click_id on public.shopify_order_attributions (click_id);
create index if not exists idx_shopify_order_attributions_user_id on public.shopify_order_attributions (user_id);
create index if not exists idx_shopify_order_attributions_brand_id on public.shopify_order_attributions (brand_id);
create index if not exists idx_shopify_order_commissions_order_id on public.shopify_order_commissions (order_id);
create index if not exists idx_shopify_order_commissions_creator_id on public.shopify_order_commissions (creator_id);
create index if not exists idx_shopify_order_commissions_brand_id on public.shopify_order_commissions (brand_id);
create index if not exists idx_shopify_user_creator_ledger_user_id_creator_id on public.shopify_user_creator_ledger (user_id, creator_id);
create index if not exists idx_shopify_creator_brand_links_creator_id on public.shopify_creator_brand_links (creator_id);
create index if not exists idx_shopify_creator_brand_links_brand_id on public.shopify_creator_brand_links (brand_id);
create index if not exists idx_shopify_creator_brand_links_shop_domain on public.shopify_creator_brand_links (shop_domain);
