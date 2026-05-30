-- AI auditor governance baseline: logging + policy support

create table if not exists ai_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intent text not null,
  query text not null,
  model text not null,
  context_size integer not null default 0,
  token_usage integer not null default 0,
  fallback_used boolean not null default false,
  latency_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_interactions_user_created_at on ai_interactions(user_id, created_at desc);
create index if not exists idx_ai_interactions_intent on ai_interactions(intent);

alter table ai_interactions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_interactions'
      and policyname = 'ai_interactions_select_own'
  ) then
    create policy ai_interactions_select_own
      on ai_interactions
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_interactions'
      and policyname = 'ai_interactions_insert_own'
  ) then
    create policy ai_interactions_insert_own
      on ai_interactions
      for insert
      with check (auth.uid() = user_id);
  end if;
end $$;
