create table if not exists public.shopify_supporter_creator_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  creator_id uuid not null,
  weight numeric not null,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, creator_id)
);

alter table public.shopify_supporter_creator_weights add column if not exists user_id uuid not null default gen_random_uuid();
alter table public.shopify_supporter_creator_weights add column if not exists creator_id uuid not null default gen_random_uuid();
alter table public.shopify_supporter_creator_weights add column if not exists weight numeric not null default 0;
alter table public.shopify_supporter_creator_weights add column if not exists active boolean default true;
alter table public.shopify_supporter_creator_weights add column if not exists created_at timestamptz default now();
alter table public.shopify_supporter_creator_weights add column if not exists updated_at timestamptz default now();

create index if not exists idx_shopify_supporter_creator_weights_user_id
  on public.shopify_supporter_creator_weights (user_id);

create index if not exists idx_shopify_supporter_creator_weights_creator_id
  on public.shopify_supporter_creator_weights (creator_id);
