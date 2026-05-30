-- 1. Reviewer Activity Metrics
create table if not exists public.reviewer_activity_metrics (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references auth.users(id),
  project_id uuid references public.projects(id) on delete cascade,
  activity_type text not null, -- 'CREDIT_REVIEW', 'EVIDENCE_VERIFICATION', 'CLARIFICATION_ISSUED', etc.
  duration_ms integer,
  metadata jsonb default '{}'::jsonb,
  trace_id uuid not null,
  causality_chain_id uuid not null,
  framework_version text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 2. Operational Queue Metrics
create table if not exists public.operational_queue_metrics (
  id uuid primary key default gen_random_uuid(),
  queue_name text not null, -- 'MAIN_REVIEW', 'CLARIFICATION_RESUBMISSION', etc.
  item_count integer not null,
  avg_wait_time_ms integer,
  max_wait_time_ms integer,
  bottleneck_alerts text[],
  trace_id uuid not null,
  causality_chain_id uuid not null,
  framework_version text not null,
  measured_at timestamptz not null default timezone('utc'::text, now())
);

-- 3. Clarification Lifecycle Metrics
create table if not exists public.clarification_lifecycle_metrics (
  id uuid primary key default gen_random_uuid(),
  submittal_id uuid not null references public.submittals(id) on delete cascade,
  round_number integer not null,
  issue_to_response_ms integer,
  response_to_review_ms integer,
  status text not null, -- 'OPEN', 'CONVERGED', 'STALE'
  trace_id uuid not null,
  causality_chain_id uuid not null,
  framework_version text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 4. Export Generation History
create table if not exists public.export_generation_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  export_type text not null, -- 'CERTIFICATION_PDF', 'AUDIT_PACKAGE', etc.
  file_path text,
  replay_hash text not null, -- Links to deterministic replay state
  lineage_proof jsonb not null, -- Verification artifacts
  triggered_by uuid references auth.users(id),
  trace_id uuid not null,
  causality_chain_id uuid not null,
  framework_version text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 5. AI Productivity Metrics
create table if not exists public.ai_productivity_metrics (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references auth.users(id),
  recommendation_id uuid, -- Optional link to ai_recommendation_logs
  action_type text not null, -- 'ACCEPTED', 'REJECTED', 'MODIFIED'
  time_saved_ms integer,
  productivity_score numeric(5,2),
  trace_id uuid not null,
  causality_chain_id uuid not null,
  framework_version text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.reviewer_activity_metrics enable row level security;
alter table public.operational_queue_metrics enable row level security;
alter table public.clarification_lifecycle_metrics enable row level security;
alter table public.export_generation_history enable row level security;
alter table public.ai_productivity_metrics enable row level security;

-- L5 (super_user) policies
create policy "L5 can manage reviewer activity metrics" on public.reviewer_activity_metrics
  for all using (auth.jwt() ->> 'global_role' in ('super_user', 'L5'));

create policy "L5 can manage operational queue metrics" on public.operational_queue_metrics
  for all using (auth.jwt() ->> 'global_role' in ('super_user', 'L5'));

create policy "L5 can manage clarification lifecycle metrics" on public.clarification_lifecycle_metrics
  for all using (auth.jwt() ->> 'global_role' in ('super_user', 'L5'));

create policy "L5 can manage export generation history" on public.export_generation_history
  for all using (auth.jwt() ->> 'global_role' in ('super_user', 'L5'));

create policy "L5 can manage ai productivity metrics" on public.ai_productivity_metrics
  for all using (auth.jwt() ->> 'global_role' in ('super_user', 'L5'));
