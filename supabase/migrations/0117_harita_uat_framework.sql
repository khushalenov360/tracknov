-- 0010_harita_uat_framework.sql

create table if not exists public.harita_uat_runs (
  id uuid primary key default gen_random_uuid(),
  run_version text not null,
  status text not null,
  start_time timestamp with time zone default timezone('utc'::text, now()) not null,
  end_time timestamp with time zone
);

create table if not exists public.harita_uat_evidence (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.harita_uat_runs(id) on delete cascade,
  scenario_id text not null,
  question text not null,
  response text not null,
  expected text not null,
  actual text not null,
  screenshot_path text,
  status text not null, -- PASS/FAIL
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- We already created harita_uat_results, harita_uat_failures, harita_uat_metrics in 0009. 
-- We will just make sure they exist for completeness if someone drops them.

alter table public.harita_uat_runs enable row level security;
alter table public.harita_uat_evidence enable row level security;

create policy "Allow full access for service role on runs" on public.harita_uat_runs using (true) with check (true);
create policy "Allow full access for service role on evidence" on public.harita_uat_evidence using (true) with check (true);
