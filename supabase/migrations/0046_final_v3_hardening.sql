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
alter table public.project_document drop constraint if exists documents_status_check;

drop trigger if exists documents_workflow_transition_guard on public.project_document;

alter table public.project_document alter column state drop default;
alter table public.project_document alter column state type text using state::text;

update public.project_document set state = 'DRAFT' where state = 'uploaded';
update public.project_document set state = 'SUBMITTED' where state = 'tagged';
update public.project_document set state = 'UNDER_REVIEW' where state = 'processing';
update public.project_document set state = 'UNDER_REVIEW' where state = 'reviewed';
update public.project_document set state = 'APPROVED' where state = 'approved';
update public.project_document set state = 'REJECTED' where state = 'rejected';

alter table public.project_document alter column state set default 'DRAFT';

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
-- workflow_logs alteration moved to 0126

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

-- 8. Recreate validate_workflow_transition to support text states and project_document
create or replace function public.validate_workflow_transition()
returns trigger
language plpgsql
as $func$
declare
  v_from_state text;
  v_to_state text;
  v_is_override boolean;
  v_override_reason text;
  v_actor_role text;
  v_actor_id uuid;
  v_project_id uuid;
  v_allowed boolean;
begin
  if tg_table_name = 'project_document' then
    if new.state is not distinct from old.state then
      return new;
    end if;
    v_from_state := old.state;
    v_to_state := new.state;
  else
    if new.status is not distinct from old.status then
      return new;
    end if;
    v_from_state := old.status::text;
    v_to_state := new.status::text;
  end if;

  v_actor_id := auth.uid();
  v_is_override := coalesce(current_setting('app.override', true), 'false') = 'true';
  v_override_reason := nullif(current_setting('app.override_reason', true), '');

  if tg_table_name = 'projects' then
    v_project_id := new.id;
  elsif tg_table_name = 'credits' then
    v_project_id := new.project_id;
  elsif tg_table_name = 'project_document' then
    v_project_id := new.project_id;
  end if;

  v_actor_role := coalesce(nullif(current_setting('app.current_user_role', true), ''), public.resolve_workflow_actor_role(tg_table_name, v_project_id));

  if v_actor_role is null then
    raise exception 'Workflow role context missing for transition % -> % on %', v_from_state, v_to_state, tg_table_name;
  end if;

  if v_is_override then
    if v_actor_role not in ('super_user', 'super_admin', 'project_admin', 'admin') then
      raise exception 'Override is allowed only for admin roles';
    end if;
    if v_override_reason is null then
      raise exception 'override_reason is required when override is used';
    end if;
  else
    select exists (
      select 1
      from public.workflow_transitions wt
      where wt.entity_type = case when tg_table_name = 'project_document' then 'documents' else tg_table_name end
        and wt.from_state = v_from_state
        and wt.to_state = v_to_state
        and v_actor_role = any(wt.allowed_roles)
    ) into v_allowed;

    if not coalesce(v_allowed, false) then
      raise exception 'Invalid transition or role not allowed: % % -> % by role %', tg_table_name, v_from_state, v_to_state, v_actor_role;
    end if;
  end if;

  -- Dependency enforcement: credits cannot be closed unless all linked docs approved.
  if tg_table_name = 'credits' and v_to_state in ('closed', 'complete') and not v_is_override then
    if exists (
      select 1
      from public.project_document d
      where d.credit_id = new.id
        and d.state <> 'APPROVED'
    ) then
      raise exception 'Cannot close credit: unapproved documents still exist';
    end if;
  end if;

  -- Dependency enforcement: projects cannot be completed unless all credits closed.
  if tg_table_name = 'projects' and v_to_state = 'completed' and not v_is_override then
    if exists (
      select 1
      from public.credits c
      where c.project_id = new.id
        and c.status not in ('closed'::public.credit_state_enum, 'complete'::public.credit_state_enum)
    ) then
      raise exception 'Cannot complete project: open credits still exist';
    end if;
  end if;

  insert into public.workflow_logs (
    entity_type,
    entity_id,
    from_state,
    to_state,
    changed_by,
    changed_by_role,
    is_override,
    override_reason
  )
  values (
    case
      when tg_table_name = 'projects' then 'project'
      when tg_table_name = 'credits' then 'credit'
      else 'document'
    end,
    new.id,
    v_from_state,
    v_to_state,
    v_actor_id,
    v_actor_role,
    v_is_override,
    v_override_reason
  );

  return new;
end;
$func$;

create trigger documents_workflow_transition_guard
before update of state on public.project_document
for each row
execute function public.validate_workflow_transition();
