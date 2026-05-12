alter table if exists public.profiles
  add column if not exists country_code text;

alter table if exists public.profiles
  add column if not exists language_tag text;

alter table if exists public.profiles
  add column if not exists theme_id text;
