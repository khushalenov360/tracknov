-- P2: user lifecycle controls (disable/reactivate/reassign support)

alter table public.profiles
  add column if not exists disabled_at timestamptz,
  add column if not exists disabled_reason text;

create index if not exists profiles_disabled_at_idx on public.profiles(disabled_at);
