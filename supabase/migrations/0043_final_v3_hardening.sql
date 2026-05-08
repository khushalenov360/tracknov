-- 0043_final_v3_hardening.sql
-- Final alignment with TechLead, PM, and Demo Mode Handoffs

-- 1. Master Table Renames (to singular form)
alter table if exists public.rating_systems rename to rating_system;
alter table if exists public.credit_categories rename to credit_category;
alter table if exists public.credit_templates rename to credit_template;
alter table if exists public.credit_scoring_rules rename to credit_scoring_rule;
alter table if exists public.rating_thresholds rename to rating_threshold;

-- 2. Project Document Rename
alter table if exists public.documents rename to project_document;

-- 3. Field Renames (status -> state)
alter table if exists public.project_credits rename column status to state;
alter table if exists public.project_document rename column status to state;

-- 4. State Constraints Update
alter table public.project_credits drop constraint if exists project_credits_status_check;
alter table public.project_credits add constraint project_credits_state_check
  check (state in ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED'));

alter table public.project_document drop constraint if exists documents_status_check;
alter table public.project_document add constraint project_document_state_check
  check (state in ('DRAFT', 'READY', 'SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION', 'RESUBMITTED', 'APPROVED', 'REJECTED'));

-- 5. PM Access System Additions
alter table public.projects add column if not exists project_code text unique;

-- Unified project_users table
create table if not exists public.project_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null check (role in ('L0', 'L1', 'L2', 'L3', 'L4', 'L5')),
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, project_id)
);

create index if not exists idx_project_users_user on public.project_users(user_id);
create index if not exists idx_project_users_project on public.project_users(project_id);

-- 6. Workflow Audit Hardening
alter table public.workflow_logs 
  add column if not exists is_override boolean not null default false,
  add column if not exists override_reason text;

-- 7. Demo Mode Seeding (Base Data)
-- Note: Real seeding would happen via a script or RPC, but we'll add a placeholder function
create or replace function public.seed_demo_data(p_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_rating_system_id uuid;
  v_project_id uuid;
  v_category_id uuid;
  v_template_id uuid;
  v_project_credit_id uuid;
begin
  -- Ensure a rating system exists
  select id into v_rating_system_id from public.rating_system limit 1;
  if v_rating_system_id is null then
    insert into public.rating_system (name, version) values ('IGBC Green Interiors', 'v2') returning id into v_rating_system_id;
  end if;

  -- Create Demo Project
  insert into public.projects (name, project_code, rating_system_id, state)
  values ('Demo Green Building – Mumbai', 'TN-DEMO-MUM-001', v_rating_system_id, 'ACTIVE')
  returning id into v_project_id;

  -- Assign user as L2 (Client View)
  insert into public.project_users (user_id, project_id, role)
  values (p_user_id, v_project_id, 'L2');

  -- Seed some credits/docs... (abbreviated for brevity)
  -- In a real implementation, this would loop through templates and create 15-20 project_credits.
  
  return v_project_id;
end;
$$;
