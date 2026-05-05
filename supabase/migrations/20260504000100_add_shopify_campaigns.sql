create table if not exists public.shopify_campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid null,
  shop_domain text not null,
  name text not null,
  shopper_offer_type text null,
  shopper_offer_value text null,
  commission_rate numeric not null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopify_campaigns add column if not exists brand_id uuid null;
alter table public.shopify_campaigns add column if not exists shop_domain text not null default '';
alter table public.shopify_campaigns add column if not exists name text not null default 'Campaign';
alter table public.shopify_campaigns add column if not exists shopper_offer_type text null;
alter table public.shopify_campaigns add column if not exists shopper_offer_value text null;
alter table public.shopify_campaigns add column if not exists commission_rate numeric not null default 0;
alter table public.shopify_campaigns add column if not exists starts_at timestamptz null;
alter table public.shopify_campaigns add column if not exists ends_at timestamptz null;
alter table public.shopify_campaigns add column if not exists status text not null default 'active';
alter table public.shopify_campaigns add column if not exists created_at timestamptz not null default now();
alter table public.shopify_campaigns add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_shopify_campaigns_shop_domain on public.shopify_campaigns (shop_domain);
create index if not exists idx_shopify_campaigns_brand_id on public.shopify_campaigns (brand_id);
create index if not exists idx_shopify_campaigns_status on public.shopify_campaigns (status);
