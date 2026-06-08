-- 0009_harita_uat_observability.sql

create table if not exists public.harita_uat_results (
  id uuid primary key default gen_random_uuid(),
  scenario_id text not null,
  input_text text not null,
  output_text text not null,
  expected_result text not null,
  status text not null, -- 'PASS' or 'FAIL'
  response_time_ms integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.harita_uat_failures (
  id uuid primary key default gen_random_uuid(),
  scenario_id text not null,
  failure_reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.harita_uat_metrics (
  id uuid primary key default gen_random_uuid(),
  capability text not null,
  pass_rate numeric not null,
  average_response_time_ms integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.harita_uat_results enable row level security;
alter table public.harita_uat_failures enable row level security;
alter table public.harita_uat_metrics enable row level security;

create policy "Allow full access for service role on results" on public.harita_uat_results using (true) with check (true);
create policy "Allow full access for service role on failures" on public.harita_uat_failures using (true) with check (true);
create policy "Allow full access for service role on metrics" on public.harita_uat_metrics using (true) with check (true);
