-- Add support points, rewards, and share links tables

-- 1. support_actions: tracks every meaningful supporter action
create table if not exists public.support_actions (
  id uuid primary key default gen_random_uuid(),
  supporter_id uuid references auth.users(id) on delete cascade,
  creator_id uuid references public.creator_profiles(id) on delete cascade,
  action_type text not null,
  points integer not null default 0,
  source_type text,
  source_url text,
  destination_url text,
  share_link_id uuid,
  reward_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_support_actions_supporter_creator
  on public.support_actions (supporter_id, creator_id);
create index if not exists idx_support_actions_creator_created
  on public.support_actions (creator_id, created_at desc);
create index if not exists idx_support_actions_share_link
  on public.support_actions (share_link_id);

-- 2. support_scores: fast read model for creator-specific supporter points
create table if not exists public.support_scores (
  id uuid primary key default gen_random_uuid(),
  supporter_id uuid references auth.users(id) on delete cascade,
  creator_id uuid references public.creator_profiles(id) on delete cascade,
  lifetime_points integer not null default 0,
  monthly_points integer not null default 0,
  last_action_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supporter_id, creator_id)
);

create index if not exists idx_support_scores_supporter
  on public.support_scores (supporter_id);
create index if not exists idx_support_scores_creator_points
  on public.support_scores (creator_id, lifetime_points desc);

-- 3. share_links: tracks supporter-generated links to creator content
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  short_code text unique not null,
  supporter_id uuid references auth.users(id) on delete cascade,
  creator_id uuid references public.creator_profiles(id) on delete cascade,
  original_url text not null,
  normalized_url text,
  platform text,
  title text,
  content_type text,
  click_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_clicked_at timestamptz
);

create index if not exists idx_share_links_short_code
  on public.share_links (short_code);
create index if not exists idx_share_links_supporter_creator
  on public.share_links (supporter_id, creator_id);
create index if not exists idx_share_links_creator_created
  on public.share_links (creator_id, created_at desc);

-- 4. share_link_clicks: anti-abuse and analytics
create table if not exists public.share_link_clicks (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid references public.share_links(id) on delete cascade,
  visitor_user_id uuid references auth.users(id) on delete set null,
  visitor_fingerprint_hash text,
  ip_hash text,
  user_agent_hash text,
  awarded_points integer not null default 0,
  was_self_click boolean not null default false,
  was_duplicate boolean not null default false,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists idx_share_link_clicks_share_link_created
  on public.share_link_clicks (share_link_id, created_at desc);
create index if not exists idx_share_link_clicks_fingerprint
  on public.share_link_clicks (share_link_id, visitor_fingerprint_hash, created_at desc);

-- 5. creator_rewards: tracks creator-defined rewards
create table if not exists public.creator_rewards (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creator_profiles(id) on delete cascade,
  title text not null,
  description text,
  reward_type text not null,
  required_points integer not null default 0,
  delivery_type text not null default 'external_url',
  destination_url text,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_rewards_reward_type_check
    check (reward_type in ('early_access', 'shared_community', 'private_ama')),
  constraint creator_rewards_delivery_type_check
    check (delivery_type in ('external_url', 'manual'))
);

create index if not exists idx_creator_rewards_creator_active
  on public.creator_rewards (creator_id, is_active);

-- 6. reward_claims: tracks claimed rewards
create table if not exists public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid references public.creator_rewards(id) on delete cascade,
  supporter_id uuid references auth.users(id) on delete cascade,
  creator_id uuid references public.creator_profiles(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  unique (reward_id, supporter_id)
);

create index if not exists idx_reward_claims_supporter_creator
  on public.reward_claims (supporter_id, creator_id);
create index if not exists idx_reward_claims_reward
  on public.reward_claims (reward_id);
