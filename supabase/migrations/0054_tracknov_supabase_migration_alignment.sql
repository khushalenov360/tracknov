-- Alignment migration from Tracknov_Supabase_Migration.sql handoff (idempotent)
-- Keeps compatibility with current runtime schema while enforcing requested SQL primitives.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'workflow_state') then
    create type public.workflow_state as enum (
      'DRAFT',
      'READY',
      'SUBMITTED',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED'
    );
  end if;
end $$;

-- Ensure base stage/submittal tables exist (requested by handoff SQL).
create table if not exists public.credit_stages (
  id uuid primary key default gen_random_uuid(),
  project_credit_id uuid references public.project_credits(id) on delete cascade,
  credit_id uuid references public.credits(id) on delete cascade,
  stage text check (stage in ('DESIGN', 'CONSTRUCTION', 'HANDOVER')),
  state public.workflow_state not null default 'DRAFT',
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.submittals (
  id uuid primary key default gen_random_uuid(),
  credit_stage_id uuid not null references public.credit_stages(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  credit_id uuid references public.credits(id) on delete cascade,
  name text,
  type text,
  required_flag boolean not null default true,
  state public.workflow_state not null default 'DRAFT',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Legacy documents table alignment (if still used)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'documents'
  ) then
    alter table public.documents
      add column if not exists submittal_id uuid references public.submittals(id) on delete set null;
  end if;
end $$;

-- Runtime project_document table alignment
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'project_document'
  ) then
    alter table public.project_document
      add column if not exists submittal_id uuid references public.submittals(id) on delete set null;
  end if;
end $$;

-- Required indexes from handoff + runtime path
create index if not exists idx_project_credits_project_id on public.project_credits(project_id);
create index if not exists idx_credit_stages_project_credit_id on public.credit_stages(project_credit_id);
create index if not exists idx_submittals_credit_stage_id on public.submittals(credit_stage_id);
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'documents'
  ) then
    create index if not exists idx_documents_submittal_id on public.documents(submittal_id);
  end if;
end $$;
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'project_document'
  ) then
    create index if not exists idx_project_document_submittal_id on public.project_document(submittal_id);
  end if;
end $$;

-- Workflow logs table requested by SQL handoff.
create table if not exists public.workflow_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  from_state public.workflow_state,
  to_state public.workflow_state,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Override logs table requested by SQL handoff.
create table if not exists public.override_logs (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  reason text not null,
  admin_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.override_logs
  add column if not exists entity_id uuid;

update public.override_logs
set entity_id = coalesce(entity_id, credit_stage_id, credit_id, project_id)
where entity_id is null;

create index if not exists idx_workflow_logs_entity on public.workflow_logs(entity_type, entity_id, created_at desc);
create index if not exists idx_override_logs_entity on public.override_logs(entity_id, created_at desc);
