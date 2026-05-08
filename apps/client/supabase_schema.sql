-- Atribe Supabase schema
-- Supports supporter and creator flows with multi-domain affiliate links.

create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext unique,
  display_name text,
  avatar_url text,
  preferred_intent text check (preferred_intent in ('supporter', 'creator', 'brand')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  display_name text not null,
  platform text not null,
  niche text,
  selected_niches jsonb not null default '[]'::jsonb,
  selected_sub_niches jsonb not null default '{}'::jsonb,
  bio text not null default '',
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.creator_profiles
  add column if not exists selected_niches jsonb not null default '[]'::jsonb;

alter table if exists public.creator_profiles
  add column if not exists selected_sub_niches jsonb not null default '{}'::jsonb;

create table if not exists public.creator_affiliate_links (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references public.creator_profiles(id) on delete cascade,
  domain citext not null,
  affiliate_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint creator_affiliate_links_domain_unique unique (creator_profile_id, domain)
);

create table if not exists public.tribe_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  creator_profile_id uuid not null references public.creator_profiles(id) on delete cascade,
  selected boolean not null default false,
  weight integer not null default 50,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tribe_memberships_weight_range check (weight between 1 and 100),
  constraint tribe_memberships_user_creator_unique unique (user_id, creator_profile_id)
);

create table if not exists public.domain_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  domain citext not null,
  source_url text,
  status text not null default 'requested'
    check (status in ('requested', 'reviewing', 'fulfilled', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint domain_requests_user_domain_unique unique (user_id, domain)
);

create table if not exists public.routing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  creator_profile_id uuid references public.creator_profiles(id) on delete set null,
  domain citext,
  destination_url text not null,
  generated_url text not null,
  opened_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.creator_social_accounts (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references public.creator_profiles(id) on delete cascade,
  platform text not null check (
    platform in ('youtube', 'instagram', 'tiktok', 'x', 'facebook', 'github', 'linkedin', 'twitch')
  ),
  username text not null,
  external_account_id text,
  status text not null default 'connected'
    check (status in ('connected', 'failed', 'disconnected')),
  granted_permissions jsonb not null default '[]'::jsonb,
  profile_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_connected_at timestamptz not null default timezone('utc', now()),
  constraint creator_social_accounts_creator_platform_unique unique (creator_profile_id, platform)
);

create table if not exists public.creator_social_audience_snapshots (
  id uuid primary key default gen_random_uuid(),
  creator_social_account_id uuid not null references public.creator_social_accounts(id) on delete cascade,
  captured_at timestamptz not null default timezone('utc', now()),
  follower_count integer,
  age_breakdown jsonb not null default '{}'::jsonb,
  gender_breakdown jsonb not null default '{}'::jsonb,
  location_breakdown jsonb not null default '{}'::jsonb,
  engagement_breakdown jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb
);

create index if not exists creator_profiles_public_idx
  on public.creator_profiles (is_public);

create index if not exists creator_affiliate_links_domain_idx
  on public.creator_affiliate_links (domain);

create index if not exists tribe_memberships_user_idx
  on public.tribe_memberships (user_id);

create index if not exists domain_requests_user_idx
  on public.domain_requests (user_id);

create index if not exists routing_events_user_idx
  on public.routing_events (user_id);

create index if not exists creator_social_accounts_creator_idx
  on public.creator_social_accounts (creator_profile_id);

create index if not exists creator_social_audience_snapshots_account_idx
  on public.creator_social_audience_snapshots (creator_social_account_id, captured_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_creator_profiles_updated_at on public.creator_profiles;
create trigger set_creator_profiles_updated_at
before update on public.creator_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_creator_affiliate_links_updated_at on public.creator_affiliate_links;
create trigger set_creator_affiliate_links_updated_at
before update on public.creator_affiliate_links
for each row
execute function public.set_updated_at();

drop trigger if exists set_tribe_memberships_updated_at on public.tribe_memberships;
create trigger set_tribe_memberships_updated_at
before update on public.tribe_memberships
for each row
execute function public.set_updated_at();

drop trigger if exists set_domain_requests_updated_at on public.domain_requests;
create trigger set_domain_requests_updated_at
before update on public.domain_requests
for each row
execute function public.set_updated_at();

drop trigger if exists set_creator_social_accounts_updated_at on public.creator_social_accounts;
create trigger set_creator_social_accounts_updated_at
before update on public.creator_social_accounts
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.creator_affiliate_links enable row level security;
alter table public.tribe_memberships enable row level security;
alter table public.domain_requests enable row level security;
alter table public.routing_events enable row level security;
alter table public.creator_social_accounts enable row level security;
alter table public.creator_social_audience_snapshots enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "creator_profiles_read_public" on public.creator_profiles;
create policy "creator_profiles_read_public"
on public.creator_profiles
for select
to authenticated
using (is_public = true or user_id = auth.uid());

drop policy if exists "creator_profiles_insert_own" on public.creator_profiles;
create policy "creator_profiles_insert_own"
on public.creator_profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "creator_profiles_update_own" on public.creator_profiles;
create policy "creator_profiles_update_own"
on public.creator_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "creator_affiliate_links_read_public" on public.creator_affiliate_links;
create policy "creator_affiliate_links_read_public"
on public.creator_affiliate_links
for select
to authenticated
using (
  exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_profile_id
      and (cp.is_public = true or cp.user_id = auth.uid())
  )
);

drop policy if exists "creator_affiliate_links_insert_own" on public.creator_affiliate_links;
create policy "creator_affiliate_links_insert_own"
on public.creator_affiliate_links
for insert
to authenticated
with check (
  exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_affiliate_links_update_own" on public.creator_affiliate_links;
create policy "creator_affiliate_links_update_own"
on public.creator_affiliate_links
for update
to authenticated
using (
  exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_profile_id
      and cp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_affiliate_links_delete_own" on public.creator_affiliate_links;
create policy "creator_affiliate_links_delete_own"
on public.creator_affiliate_links
for delete
to authenticated
using (
  exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "tribe_memberships_select_own" on public.tribe_memberships;
create policy "tribe_memberships_select_own"
on public.tribe_memberships
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "tribe_memberships_insert_own" on public.tribe_memberships;
create policy "tribe_memberships_insert_own"
on public.tribe_memberships
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "tribe_memberships_update_own" on public.tribe_memberships;
create policy "tribe_memberships_update_own"
on public.tribe_memberships
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "tribe_memberships_delete_own" on public.tribe_memberships;
create policy "tribe_memberships_delete_own"
on public.tribe_memberships
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "domain_requests_select_own" on public.domain_requests;
create policy "domain_requests_select_own"
on public.domain_requests
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "domain_requests_insert_own" on public.domain_requests;
create policy "domain_requests_insert_own"
on public.domain_requests
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "domain_requests_update_own" on public.domain_requests;
create policy "domain_requests_update_own"
on public.domain_requests
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "routing_events_select_own" on public.routing_events;
create policy "routing_events_select_own"
on public.routing_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "routing_events_insert_own" on public.routing_events;
create policy "routing_events_insert_own"
on public.routing_events
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "creator_social_accounts_select_own" on public.creator_social_accounts;
create policy "creator_social_accounts_select_own"
on public.creator_social_accounts
for select
to authenticated
using (
  exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_social_accounts_insert_own" on public.creator_social_accounts;
create policy "creator_social_accounts_insert_own"
on public.creator_social_accounts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_social_accounts_update_own" on public.creator_social_accounts;
create policy "creator_social_accounts_update_own"
on public.creator_social_accounts
for update
to authenticated
using (
  exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_profile_id
      and cp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_social_accounts_delete_own" on public.creator_social_accounts;
create policy "creator_social_accounts_delete_own"
on public.creator_social_accounts
for delete
to authenticated
using (
  exists (
    select 1
    from public.creator_profiles cp
    where cp.id = creator_profile_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_social_audience_snapshots_select_own" on public.creator_social_audience_snapshots;
create policy "creator_social_audience_snapshots_select_own"
on public.creator_social_audience_snapshots
for select
to authenticated
using (
  exists (
    select 1
    from public.creator_social_accounts csa
    join public.creator_profiles cp on cp.id = csa.creator_profile_id
    where csa.id = creator_social_account_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "creator_social_audience_snapshots_insert_own" on public.creator_social_audience_snapshots;
create policy "creator_social_audience_snapshots_insert_own"
on public.creator_social_audience_snapshots
for insert
to authenticated
with check (
  exists (
    select 1
    from public.creator_social_accounts csa
    join public.creator_profiles cp on cp.id = csa.creator_profile_id
    where csa.id = creator_social_account_id
      and cp.user_id = auth.uid()
  )
);

create or replace function public.resolve_creator_link(
  destination text,
  selected_creator_ids uuid[] default null
)
returns table (
  creator_profile_id uuid,
  domain citext,
  affiliate_url text
)
language sql
stable
as $$
  select
    cp.id as creator_profile_id,
    cal.domain,
    cal.affiliate_url
  from public.creator_profiles cp
  join public.creator_affiliate_links cal
    on cal.creator_profile_id = cp.id
  where cal.is_active = true
    and replace(split_part(split_part(destination, '://', 2), '/', 1), 'www.', '') = cal.domain
    and (
      selected_creator_ids is null
      or cp.id = any(selected_creator_ids)
    )
  order by cp.created_at asc
$$;

-- Demo seed data for local testing in Supabase SQL Editor.
-- These inserts are idempotent and let you test supporter + creator flows quickly.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'supporter@atribe.app',
    crypt('AtribeDemo123!', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Atribe Supporter"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'creator@atribe.app',
    crypt('AtribeDemo123!', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Elena Voss"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'julian@atribe.app',
    crypt('AtribeDemo123!', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Julian Vane"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'anya@atribe.app',
    crypt('AtribeDemo123!', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Anya Roe"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (id) do update
set
  email = excluded.email,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = timezone('utc', now());

insert into public.profiles (id, email, display_name, preferred_intent)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'supporter@atribe.app',
    'Atribe Supporter',
    'supporter'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'creator@atribe.app',
    'Elena Voss',
    'creator'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'julian@atribe.app',
    'Julian Vane',
    'creator'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'anya@atribe.app',
    'Anya Roe',
    'creator'
  )
on conflict (id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  preferred_intent = excluded.preferred_intent,
  updated_at = timezone('utc', now());

insert into public.creator_profiles (
  id,
  user_id,
  display_name,
  platform,
  niche,
  bio,
  is_public
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '22222222-2222-2222-2222-222222222222',
    'Elena Voss',
    'Substack',
    'Editorial style',
    'Independent essays on fashion, design, and cultural memory.',
    true
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '33333333-3333-3333-3333-333333333333',
    'Julian Vane',
    'YouTube',
    'Lifestyle / tech',
    'Long-form reviews on design tools, workspaces, and slow tech.',
    true
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '44444444-4444-4444-4444-444444444444',
    'Anya Roe',
    'Instagram',
    'Architecture',
    'A calm lens on interiors, materials, and modern living.',
    true
  )
on conflict (id) do update
set
  display_name = excluded.display_name,
  platform = excluded.platform,
  niche = excluded.niche,
  bio = excluded.bio,
  is_public = excluded.is_public,
  updated_at = timezone('utc', now());

insert into public.creator_affiliate_links (
  id,
  creator_profile_id,
  domain,
  affiliate_url,
  is_active
)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'reformation.com',
    'https://www.reformation.com/?utm_source=atribe&utm_medium=creator&utm_campaign=elena-voss',
    true
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'sezane.com',
    'https://www.sezane.com/?utm_source=atribe&utm_medium=creator&utm_campaign=elena-voss',
    true
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'amazon.in',
    'https://www.amazon.in/?tag=julianvane-20',
    true
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'notion.so',
    'https://www.notion.so/?utm_source=atribe&utm_medium=creator&utm_campaign=julian-vane',
    true
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb005',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'ssense.com',
    'https://www.ssense.com/?utm_source=atribe&utm_medium=creator&utm_campaign=anya-roe',
    true
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb006',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'hem.com',
    'https://www.hem.com/?utm_source=atribe&utm_medium=creator&utm_campaign=anya-roe',
    true
  )
on conflict (id) do update
set
  domain = excluded.domain,
  affiliate_url = excluded.affiliate_url,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

insert into public.tribe_memberships (
  id,
  user_id,
  creator_profile_id,
  selected,
  weight
)
values
  (
    'cccccccc-cccc-cccc-cccc-ccccccccc001',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    true,
    60
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccc002',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    true,
    40
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccc003',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    false,
    30
  )
on conflict (id) do update
set
  selected = excluded.selected,
  weight = excluded.weight,
  updated_at = timezone('utc', now());

insert into public.domain_requests (
  id,
  user_id,
  domain,
  source_url,
  status
)
values
  (
    'dddddddd-dddd-dddd-dddd-ddddddddd001',
    '11111111-1111-1111-1111-111111111111',
    'store.brand.com',
    'https://store.brand.com/seasonal-drop',
    'requested'
  )
on conflict (id) do update
set
  source_url = excluded.source_url,
  status = excluded.status,
  updated_at = timezone('utc', now());

insert into public.routing_events (
  id,
  user_id,
  creator_profile_id,
  domain,
  destination_url,
  generated_url,
  opened_at
)
values
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeee001',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'reformation.com',
    'https://www.reformation.com/products/mallow-dress',
    'https://www.reformation.com/products/mallow-dress?utm_source=atribe&utm_medium=creator&utm_campaign=elena-voss',
    timezone('utc', now())
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeee002',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'amazon.in',
    'https://www.amazon.in/dp/B0TEST1234',
    'https://www.amazon.in/dp/B0TEST1234?tag=julianvane-20',
    timezone('utc', now())
  )
on conflict (id) do update
set
  generated_url = excluded.generated_url,
  opened_at = excluded.opened_at;
