alter table if exists public.profiles
  drop constraint if exists profiles_preferred_intent_check;

alter table if exists public.profiles
  add constraint profiles_preferred_intent_check
  check (preferred_intent in ('supporter', 'creator', 'brand'));
