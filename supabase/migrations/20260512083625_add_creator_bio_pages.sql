alter table if exists public.creator_social_accounts
  add column if not exists provider_account_id text,
  add column if not exists provider_username text,
  add column if not exists provider_display_name text,
  add column if not exists provider_avatar_url text,
  add column if not exists granted_scopes jsonb not null default '[]'::jsonb,
  add column if not exists token_expires_at timestamptz,
  add column if not exists last_synced_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'creator_social_accounts'
      and constraint_name = 'creator_social_accounts_platform_check'
  ) then
    alter table public.creator_social_accounts
      drop constraint creator_social_accounts_platform_check;
  end if;
end $$;

alter table public.creator_social_accounts
  add constraint creator_social_accounts_platform_check
  check (platform in ('youtube', 'instagram', 'tiktok', 'x', 'facebook', 'github', 'linkedin', 'twitch', 'spotify', 'discord'));

create table if not exists public.creator_social_account_credentials (
  id uuid primary key default gen_random_uuid(),
  creator_social_account_id uuid not null unique references public.creator_social_accounts(id) on delete cascade,
  access_token text,
  refresh_token text,
  token_type text,
  expires_at timestamptz,
  scopes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.creator_bio_pages (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null unique references public.creator_profiles(id) on delete cascade,
  slug citext unique,
  is_published boolean not null default true,
  headline text,
  bio text,
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.creator_bio_platforms (
  id uuid primary key default gen_random_uuid(),
  creator_bio_page_id uuid not null references public.creator_bio_pages(id) on delete cascade,
  creator_social_account_id uuid not null references public.creator_social_accounts(id) on delete cascade,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint creator_bio_platforms_page_account_unique unique (creator_bio_page_id, creator_social_account_id)
);

create table if not exists public.creator_bio_manual_links (
  id uuid primary key default gen_random_uuid(),
  creator_bio_page_id uuid not null references public.creator_bio_pages(id) on delete cascade,
  label text not null,
  url text not null,
  icon text,
  category text,
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.creator_social_content_items (
  id uuid primary key default gen_random_uuid(),
  creator_social_account_id uuid not null references public.creator_social_accounts(id) on delete cascade,
  provider_content_id text not null,
  platform text not null,
  title text,
  caption text,
  thumbnail_url text,
  content_url text not null,
  published_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint creator_social_content_items_account_provider_unique unique (creator_social_account_id, provider_content_id)
);

create index if not exists creator_bio_pages_creator_idx
  on public.creator_bio_pages (creator_id);

create index if not exists creator_bio_pages_slug_idx
  on public.creator_bio_pages (slug);

create index if not exists creator_bio_platforms_page_idx
  on public.creator_bio_platforms (creator_bio_page_id, sort_order);

create index if not exists creator_bio_manual_links_page_idx
  on public.creator_bio_manual_links (creator_bio_page_id, sort_order);

create index if not exists creator_social_content_items_account_idx
  on public.creator_social_content_items (creator_social_account_id, published_at desc);

drop trigger if exists set_creator_social_account_credentials_updated_at on public.creator_social_account_credentials;
create trigger set_creator_social_account_credentials_updated_at
before update on public.creator_social_account_credentials
for each row
execute function public.set_updated_at();

drop trigger if exists set_creator_bio_pages_updated_at on public.creator_bio_pages;
create trigger set_creator_bio_pages_updated_at
before update on public.creator_bio_pages
for each row
execute function public.set_updated_at();

drop trigger if exists set_creator_bio_platforms_updated_at on public.creator_bio_platforms;
create trigger set_creator_bio_platforms_updated_at
before update on public.creator_bio_platforms
for each row
execute function public.set_updated_at();

drop trigger if exists set_creator_bio_manual_links_updated_at on public.creator_bio_manual_links;
create trigger set_creator_bio_manual_links_updated_at
before update on public.creator_bio_manual_links
for each row
execute function public.set_updated_at();

drop trigger if exists set_creator_social_content_items_updated_at on public.creator_social_content_items;
create trigger set_creator_social_content_items_updated_at
before update on public.creator_social_content_items
for each row
execute function public.set_updated_at();

alter table public.creator_social_account_credentials enable row level security;
alter table public.creator_bio_pages enable row level security;
alter table public.creator_bio_platforms enable row level security;
alter table public.creator_bio_manual_links enable row level security;
alter table public.creator_social_content_items enable row level security;

drop policy if exists "creator_bio_pages_read_public" on public.creator_bio_pages;
create policy "creator_bio_pages_read_public"
on public.creator_bio_pages
for select
to anon, authenticated
using (
  is_published = true
  or exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_bio_pages_insert_own" on public.creator_bio_pages;
create policy "creator_bio_pages_insert_own"
on public.creator_bio_pages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_bio_pages_update_own" on public.creator_bio_pages;
create policy "creator_bio_pages_update_own"
on public.creator_bio_pages
for update
to authenticated
using (
  exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_id
      and cp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_bio_platforms_read_public" on public.creator_bio_platforms;
create policy "creator_bio_platforms_read_public"
on public.creator_bio_platforms
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.creator_bio_pages cbp
    join public.creator_profiles cp on cp.id = cbp.creator_id
    where cbp.id = creator_bio_page_id
      and (cbp.is_published = true or cp.user_id = auth.uid())
  )
);

drop policy if exists "creator_bio_platforms_insert_own" on public.creator_bio_platforms;
create policy "creator_bio_platforms_insert_own"
on public.creator_bio_platforms
for insert
to authenticated
with check (
  exists (
    select 1
    from public.creator_bio_pages cbp
    join public.creator_profiles cp on cp.id = cbp.creator_id
    where cbp.id = creator_bio_page_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_bio_platforms_update_own" on public.creator_bio_platforms;
create policy "creator_bio_platforms_update_own"
on public.creator_bio_platforms
for update
to authenticated
using (
  exists (
    select 1
    from public.creator_bio_pages cbp
    join public.creator_profiles cp on cp.id = cbp.creator_id
    where cbp.id = creator_bio_page_id
      and cp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.creator_bio_pages cbp
    join public.creator_profiles cp on cp.id = cbp.creator_id
    where cbp.id = creator_bio_page_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_bio_manual_links_read_public" on public.creator_bio_manual_links;
create policy "creator_bio_manual_links_read_public"
on public.creator_bio_manual_links
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.creator_bio_pages cbp
    join public.creator_profiles cp on cp.id = cbp.creator_id
    where cbp.id = creator_bio_page_id
      and (
        (is_enabled = true and cbp.is_published = true)
        or cp.user_id = auth.uid()
      )
  )
);

drop policy if exists "creator_bio_manual_links_insert_own" on public.creator_bio_manual_links;
create policy "creator_bio_manual_links_insert_own"
on public.creator_bio_manual_links
for insert
to authenticated
with check (
  exists (
    select 1
    from public.creator_bio_pages cbp
    join public.creator_profiles cp on cp.id = cbp.creator_id
    where cbp.id = creator_bio_page_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_bio_manual_links_update_own" on public.creator_bio_manual_links;
create policy "creator_bio_manual_links_update_own"
on public.creator_bio_manual_links
for update
to authenticated
using (
  exists (
    select 1
    from public.creator_bio_pages cbp
    join public.creator_profiles cp on cp.id = cbp.creator_id
    where cbp.id = creator_bio_page_id
      and cp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.creator_bio_pages cbp
    join public.creator_profiles cp on cp.id = cbp.creator_id
    where cbp.id = creator_bio_page_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_bio_manual_links_delete_own" on public.creator_bio_manual_links;
create policy "creator_bio_manual_links_delete_own"
on public.creator_bio_manual_links
for delete
to authenticated
using (
  exists (
    select 1
    from public.creator_bio_pages cbp
    join public.creator_profiles cp on cp.id = cbp.creator_id
    where cbp.id = creator_bio_page_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_social_content_items_read_public" on public.creator_social_content_items;
create policy "creator_social_content_items_read_public"
on public.creator_social_content_items
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.creator_bio_platforms cbpl
    join public.creator_bio_pages cbp on cbp.id = cbpl.creator_bio_page_id
    join public.creator_profiles cp on cp.id = cbp.creator_id
    where cbpl.creator_social_account_id = creator_social_account_id
      and cbpl.is_enabled = true
      and (cbp.is_published = true or cp.user_id = auth.uid())
  )
);
