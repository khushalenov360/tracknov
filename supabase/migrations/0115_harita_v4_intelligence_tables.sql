-- 0008_harita_v4_intelligence_tables.sql

-- 1. Project Memory
create table if not exists public.harita_project_memory (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  memory_type text not null, -- 'preference', 'decision', 'risk', 'discussion'
  content text not null,
  context jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.harita_project_memory enable row level security;
create policy "Allow full access for service role" on public.harita_project_memory using (true) with check (true);

-- 2. Project Decisions
create table if not exists public.harita_project_decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  decision text not null,
  rationale text,
  decided_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.harita_project_decisions enable row level security;
create policy "Allow full access for service role" on public.harita_project_decisions using (true) with check (true);

-- 3. Project Risks
create table if not exists public.harita_project_risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  risk_level text not null, -- 'HIGH', 'MEDIUM', 'LOW'
  description text not null,
  credit_id uuid references public.project_credits(id) on delete cascade,
  resolved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.harita_project_risks enable row level security;
create policy "Allow full access for service role" on public.harita_project_risks using (true) with check (true);

-- 4. Project Insights
create table if not exists public.harita_project_insights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  insight_type text not null, -- 'RISK', 'OPPORTUNITY', 'ACTION'
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.harita_project_insights enable row level security;
create policy "Allow full access for service role" on public.harita_project_insights using (true) with check (true);

-- 5. Cross-Project Pattern Libraries (Global, No project_id link to prevent PII exposure, uses generic identifiers)
create table if not exists public.credit_pattern_library (
  id uuid primary key default gen_random_uuid(),
  credit_code text not null unique,
  common_evidence jsonb not null default '[]'::jsonb,
  success_rate numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.credit_pattern_library enable row level security;
create policy "Allow full access for service role" on public.credit_pattern_library using (true) with check (true);

create table if not exists public.document_pattern_library (
  id uuid primary key default gen_random_uuid(),
  document_type text not null unique,
  common_credits jsonb not null default '[]'::jsonb,
  average_strength numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.document_pattern_library enable row level security;
create policy "Allow full access for service role" on public.document_pattern_library using (true) with check (true);

create table if not exists public.project_pattern_library (
  id uuid primary key default gen_random_uuid(),
  certification_type text not null unique,
  average_completion_time text,
  common_risks jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.project_pattern_library enable row level security;
create policy "Allow full access for service role" on public.project_pattern_library using (true) with check (true);

-- 6. Graphs and Projections
create table if not exists public.evidence_graph (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  credit_id uuid references public.project_credits(id) on delete cascade,
  document_id uuid references public.project_document(id) on delete cascade,
  strength numeric,
  is_missing boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.evidence_graph enable row level security;
create policy "Allow full access for service role" on public.evidence_graph using (true) with check (true);

create table if not exists public.assignment_graph (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  credit_id uuid not null references public.project_credits(id) on delete cascade,
  requirement_type text not null,
  contributor_id uuid references public.profiles(user_id) on delete set null,
  status text not null default 'PENDING',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.assignment_graph enable row level security;
create policy "Allow full access for service role" on public.assignment_graph using (true) with check (true);

create table if not exists public.certification_projections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  expected_rating text,
  expected_points numeric,
  risk_adjusted_points numeric,
  readiness_score numeric,
  confidence_score numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.certification_projections enable row level security;
create policy "Allow full access for service role" on public.certification_projections using (true) with check (true);
