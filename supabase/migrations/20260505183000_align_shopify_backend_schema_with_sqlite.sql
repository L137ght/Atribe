create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.shopify_users (
  id uuid primary key,
  email text null,
  created_at timestamptz not null default now()
);

create table if not exists public.shopify_creators (
  id uuid primary key,
  user_id uuid null,
  name text null,
  external_tags_json jsonb null,
  created_at timestamptz not null default now()
);

create table if not exists public.shopify_creator_affiliate_links (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.shopify_creators (id) on delete cascade,
  domain text not null,
  affiliate_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, domain)
);

alter table public.shopify_brand_integrations
  add column if not exists default_commission_rate numeric null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shopify_supporter_creator_weights_user_creator_unique'
  ) then
    alter table public.shopify_supporter_creator_weights
      add constraint shopify_supporter_creator_weights_user_creator_unique
      unique (user_id, creator_id);
  end if;
end
$$;

alter table public.shopify_orders
  add column if not exists updated_at timestamptz not null default now();

alter table public.shopify_order_attributions
  add column if not exists atribe_ref text null;

alter table public.shopify_order_attributions
  add column if not exists coupon_code text null;

alter table public.shopify_order_attributions
  add column if not exists processed_at timestamptz not null default now();

update public.shopify_order_attributions
set processed_at = coalesce(processed_at, created_at, now())
where processed_at is null;

update public.shopify_orders
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

create unique index if not exists idx_shopify_creator_coupon_mappings_coupon_code_null_shop_domain_unique
  on public.shopify_creator_coupon_mappings (coupon_code)
  where shop_domain is null;

create unique index if not exists idx_shopify_creator_brand_links_creator_shop_unique
  on public.shopify_creator_brand_links (creator_id, shop_domain);

create index if not exists idx_shopify_users_email on public.shopify_users (email);
create index if not exists idx_shopify_creators_user_id on public.shopify_creators (user_id);
create index if not exists idx_shopify_creator_affiliate_links_creator_id
  on public.shopify_creator_affiliate_links (creator_id);
create index if not exists idx_shopify_creator_affiliate_links_domain
  on public.shopify_creator_affiliate_links (domain);
create index if not exists idx_shopify_order_attributions_processed_at
  on public.shopify_order_attributions (processed_at desc);
create index if not exists idx_shopify_orders_updated_at
  on public.shopify_orders (updated_at desc);

drop trigger if exists shopify_creator_affiliate_links_set_updated_at on public.shopify_creator_affiliate_links;
create trigger shopify_creator_affiliate_links_set_updated_at
before update on public.shopify_creator_affiliate_links
for each row execute function public.set_updated_at();

drop trigger if exists shopify_creator_brand_links_set_updated_at on public.shopify_creator_brand_links;
create trigger shopify_creator_brand_links_set_updated_at
before update on public.shopify_creator_brand_links
for each row execute function public.set_updated_at();

drop trigger if exists shopify_brand_integrations_set_updated_at on public.shopify_brand_integrations;
create trigger shopify_brand_integrations_set_updated_at
before update on public.shopify_brand_integrations
for each row execute function public.set_updated_at();

drop trigger if exists shopify_shops_set_updated_at on public.shopify_shops;
create trigger shopify_shops_set_updated_at
before update on public.shopify_shops
for each row execute function public.set_updated_at();

drop trigger if exists shopify_supporter_creator_weights_set_updated_at on public.shopify_supporter_creator_weights;
create trigger shopify_supporter_creator_weights_set_updated_at
before update on public.shopify_supporter_creator_weights
for each row execute function public.set_updated_at();

drop trigger if exists shopify_orders_set_updated_at on public.shopify_orders;
create trigger shopify_orders_set_updated_at
before update on public.shopify_orders
for each row execute function public.set_updated_at();

alter table public.shopify_users enable row level security;
alter table public.shopify_creators enable row level security;
alter table public.shopify_creator_affiliate_links enable row level security;
alter table public.shopify_brand_integrations enable row level security;
alter table public.shopify_shops enable row level security;
alter table public.shopify_script_tags enable row level security;
alter table public.shopify_webhook_registrations enable row level security;
alter table public.shopify_links enable row level security;
alter table public.shopify_link_clicks enable row level security;
alter table public.shopify_click_weight_snapshots enable row level security;
alter table public.shopify_orders enable row level security;
alter table public.shopify_order_attributions enable row level security;
alter table public.shopify_order_commissions enable row level security;
alter table public.shopify_creator_coupon_mappings enable row level security;
alter table public.shopify_user_creator_ledger enable row level security;
alter table public.shopify_creator_brand_links enable row level security;
alter table public.shopify_supporter_creator_weights enable row level security;
alter table public.shopify_campaigns enable row level security;
