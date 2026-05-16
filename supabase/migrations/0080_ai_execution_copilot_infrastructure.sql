-- Migration: 0080_ai_execution_copilot_infrastructure.sql

-- 1. AI Recommendation Logs (Immutable Ledger)
create table if not exists public.ai_recommendation_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id),
  recommendation_type text not null,
  payload jsonb not null default '{}'::jsonb,
  reasoning text,
  trace_id uuid not null,
  causality_chain_id uuid not null,
  framework_version text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 2. AI Clarification Drafts
create table if not exists public.ai_clarification_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  submittal_id uuid references public.submittals(id) on delete cascade,
  draft_content text not null,
  suggested_by_actor_id uuid references auth.users(id),
  trace_id uuid not null,
  causality_chain_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'discarded')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 3. AI Execution Risk Reports
create table if not exists public.ai_execution_risk_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  risk_score numeric not null check (risk_score >= 0 and risk_score <= 100),
  risk_factors jsonb not null default '[]'::jsonb,
  mitigation_recommendations text,
  trace_id uuid not null,
  causality_chain_id uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 4. AI Evidence Reuse Maps
create table if not exists public.ai_evidence_reuse_maps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_document_id uuid not null references public.project_documents(id) on delete cascade,
  target_credit_id uuid not null,
  confidence_score numeric not null check (confidence_score >= 0 and confidence_score <= 1),
  trace_id uuid not null,
  causality_chain_id uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 5. AI Duplicate Evidence Reports
create table if not exists public.ai_duplicate_evidence_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_a_id uuid not null references public.project_documents(id) on delete cascade,
  document_b_id uuid not null references public.project_documents(id) on delete cascade,
  similarity_score numeric not null check (similarity_score >= 0 and similarity_score <= 1),
  detection_details jsonb not null default '{}'::jsonb,
  trace_id uuid not null,
  causality_chain_id uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- RLS Policies
alter table public.ai_recommendation_logs enable row level security;
alter table public.ai_clarification_drafts enable row level security;
alter table public.ai_execution_risk_reports enable row level security;
alter table public.ai_evidence_reuse_maps enable row level security;
alter table public.ai_duplicate_evidence_reports enable row level security;

-- Drop existing policies if they exist to avoid errors on migration retry
drop policy if exists "ai_rec_logs_super_user" on public.ai_recommendation_logs;
drop policy if exists "ai_clar_drafts_super_user" on public.ai_clarification_drafts;
drop policy if exists "ai_risk_reports_super_user" on public.ai_execution_risk_reports;
drop policy if exists "ai_reuse_maps_super_user" on public.ai_evidence_reuse_maps;
drop policy if exists "ai_dup_reports_super_user" on public.ai_duplicate_evidence_reports;

create policy "ai_rec_logs_super_user" on public.ai_recommendation_logs for all using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.global_role = 'super_user'));
create policy "ai_clar_drafts_super_user" on public.ai_clarification_drafts for all using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.global_role = 'super_user'));
create policy "ai_risk_reports_super_user" on public.ai_execution_risk_reports for all using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.global_role = 'super_user'));
create policy "ai_reuse_maps_super_user" on public.ai_evidence_reuse_maps for all using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.global_role = 'super_user'));
create policy "ai_dup_reports_super_user" on public.ai_duplicate_evidence_reports for all using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.global_role = 'super_user'));

-- Indexes
create index if not exists idx_ai_rec_logs_project on public.ai_recommendation_logs(project_id);
create index if not exists idx_ai_clar_drafts_project on public.ai_clarification_drafts(project_id);
create index if not exists idx_ai_risk_reports_project on public.ai_execution_risk_reports(project_id);
create index if not exists idx_ai_reuse_maps_project on public.ai_evidence_reuse_maps(project_id);
create index if not exists idx_ai_dup_reports_project on public.ai_duplicate_evidence_reports(project_id);
