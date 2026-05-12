-- Add durable price history ownership tables.

create extension if not exists "pgcrypto";

create table if not exists public.price_history_products (
  id uuid primary key default gen_random_uuid(),
  marketplace text not null,
  product_id text,
  canonical_url text,
  resolved_url text,
  title text,
  image_url text,
  provider_page_url text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists idx_price_history_products_marketplace_product_id
  on public.price_history_products (marketplace, product_id)
  where product_id is not null;

create unique index if not exists idx_price_history_products_marketplace_canonical_url
  on public.price_history_products (marketplace, canonical_url)
  where product_id is null and canonical_url is not null;

create index if not exists idx_price_history_products_last_seen
  on public.price_history_products (last_seen_at desc);

create table if not exists public.price_history_observations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.price_history_products(id) on delete cascade,
  source text not null,
  observed_at timestamptz not null default now(),
  current_price numeric,
  lowest_price numeric,
  average_price numeric,
  highest_price numeric,
  currency text not null default 'INR',
  confidence numeric,
  raw_payload jsonb not null default '{}'
);

create index if not exists idx_price_history_observations_product_observed
  on public.price_history_observations (product_id, observed_at desc);

create table if not exists public.price_history_points (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.price_history_products(id) on delete cascade,
  source text not null,
  price_date date not null,
  price numeric not null,
  currency text not null default 'INR'
);

create unique index if not exists idx_price_history_points_unique
  on public.price_history_points (product_id, source, price_date, price);

create index if not exists idx_price_history_points_product_date
  on public.price_history_points (product_id, price_date);

create table if not exists public.price_history_lookup_events (
  id uuid primary key default gen_random_uuid(),
  requested_url text not null,
  normalized_url text,
  product_id uuid references public.price_history_products(id) on delete set null,
  status text not null,
  provider text,
  attempted_providers text[],
  error_code text,
  elapsed_ms integer,
  cache_status text,
  created_at timestamptz not null default now()
);

create index if not exists idx_price_history_lookup_events_product_created
  on public.price_history_lookup_events (product_id, created_at desc);

create index if not exists idx_price_history_lookup_events_status_created
  on public.price_history_lookup_events (status, created_at desc);

alter table public.price_history_products enable row level security;
alter table public.price_history_observations enable row level security;
alter table public.price_history_points enable row level security;
alter table public.price_history_lookup_events enable row level security;
