-- Refactor projects and project_credits for the new master library layer

-- Add new columns to projects
alter table public.projects
  add column if not exists rating_system_id uuid references public.rating_systems(id) on delete set null,
  add column if not exists state text not null default 'DRAFT' check (state in ('DRAFT', 'ACTIVE', 'SUBMITTED_TO_IGBC', 'UNDER_REVIEW', 'CLARIFICATION', 'RESUBMITTED', 'APPROVED', 'REJECTED')),
  add column if not exists submission_flag boolean not null default false,
  add column if not exists lock_flag boolean not null default false;

-- Add new columns to project_credits
alter table public.project_credits
  add column if not exists credit_template_id uuid references public.credit_templates(id) on delete set null,
  add column if not exists credit_code text,
  add column if not exists credit_name text,
  add column if not exists category_id uuid,
  add column if not exists category_name text,
  add column if not exists max_points numeric not null default 0,
  add column if not exists achieved_points numeric not null default 0,
  add column if not exists is_review_required boolean not null default false;

-- Add state machine check for project_credits
alter table public.project_credits
  drop constraint if exists project_credits_status_check;

-- The TechLead handoff uses 'state' but project_credits currently has 'status'.
-- I'll keep 'status' but update the check or rename it later.
-- Handoff states: DRAFT, ASSIGNED, IN_PROGRESS, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CLOSED
alter table public.project_credits
  add constraint project_credits_status_check
  check (status in ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED'));

-- Project Workflow Locking System
create or replace function public.enforce_project_lock()
returns trigger
language plpgsql
as $$
begin
  if old.lock_flag = true and new.lock_flag = true then
    -- Check if it's an admin override (this would be handled by RLS or specific logic, 
    -- but here we just block any mutation if locked unless lock_flag is being toggled)
    if (tg_op = 'UPDATE' and old.* is distinct from new.* and old.lock_flag = new.lock_flag) then
      raise exception 'Project is locked for submission and cannot be modified.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists project_lock_trigger on public.projects;
create trigger project_lock_trigger
before update on public.projects
for each row execute function public.enforce_project_lock();

-- Dependency rule: Project COMPLETED (or APPROVED) only if all credits CLOSED
-- This might be better as a validation function rather than a trigger to allow partial updates.
