-- Tracknov P0: PostgreSQL-native workflow state enforcement
-- Includes:
-- 1) ENUM-backed status columns
-- 2) Transition rules table
-- 3) DB-level role + transition + dependency validation trigger
-- 4) Soft override with mandatory reason
-- 5) Audit enrichment in workflow_logs

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_state_enum') then
    create type public.project_state_enum as enum (
      'draft', 'ready', 'active', 'on_hold', 'completed', 'archived'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'credit_state_enum') then
    create type public.credit_state_enum as enum (
      'draft', 'pending', 'assigned', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'blocked', 'complete', 'closed'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'document_state_enum') then
    create type public.document_state_enum as enum (
      'uploaded', 'tagged', 'submitted', 'under_review', 'owner_approved', 'approved', 'rejected', 'revised'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Existing data normalization
-- ---------------------------------------------------------------------------
update public.projects
set status = case lower(coalesce(status, 'active'))
  when 'active' then 'active'
  when 'on_hold' then 'on_hold'
  when 'completed' then 'completed'
  when 'archived' then 'archived'
  when 'draft' then 'draft'
  when 'ready' then 'ready'
  else 'active'
end;

update public.credits
set status = case lower(coalesce(status, 'assigned'))
  when 'pending' then 'pending'
  when 'assigned' then 'assigned'
  when 'in_progress' then 'in_progress'
  when 'submitted' then 'submitted'
  when 'under_review' then 'under_review'
  when 'approved' then 'approved'
  when 'blocked' then 'blocked'
  when 'rejected' then 'rejected'
  when 'complete' then 'complete'
  when 'closed' then 'closed'
  else 'pending'
end;

update public.documents
set status = case lower(coalesce(status, 'uploaded'))
  when 'uploaded' then 'uploaded'
  when 'owner_approved' then 'owner_approved'
  when 'approved' then 'approved'
  when 'rejected' then 'rejected'
  when 'tagged' then 'tagged'
  when 'submitted' then 'submitted'
  when 'under_review' then 'under_review'
  when 'revised' then 'revised'
  else 'uploaded'
end;

-- ---------------------------------------------------------------------------
-- Convert to ENUM-backed fields
-- ---------------------------------------------------------------------------
-- Legacy check constraints no longer needed for enum-backed columns.
alter table public.projects drop constraint if exists projects_status_check;
alter table public.credits drop constraint if exists credits_status_check;
alter table public.documents drop constraint if exists documents_status_check;

alter table public.projects alter column status drop default;
alter table public.projects
  alter column status type public.project_state_enum
  using status::public.project_state_enum;
alter table public.projects alter column status set default 'active'::public.project_state_enum;

alter table public.credits alter column status drop default;
alter table public.credits
  alter column status type public.credit_state_enum
  using status::public.credit_state_enum;
alter table public.credits alter column status set default 'assigned'::public.credit_state_enum;

alter table public.documents alter column status drop default;
alter table public.documents
  alter column status type public.document_state_enum
  using status::public.document_state_enum;
alter table public.documents alter column status set default 'uploaded'::public.document_state_enum;

-- ---------------------------------------------------------------------------
-- CHECK constraints (extra safety)
-- ---------------------------------------------------------------------------
alter table public.projects drop constraint if exists projects_status_not_null_enum_chk;
alter table public.projects
  add constraint projects_status_not_null_enum_chk check (status is not null);

alter table public.credits drop constraint if exists credits_status_not_null_enum_chk;
alter table public.credits
  add constraint credits_status_not_null_enum_chk check (status is not null);

alter table public.documents drop constraint if exists documents_status_not_null_enum_chk;
alter table public.documents
  add constraint documents_status_not_null_enum_chk check (status is not null);

-- ---------------------------------------------------------------------------
-- Transition rules table
-- ---------------------------------------------------------------------------
create table if not exists public.workflow_transitions (
  id bigserial primary key,
  entity_type text not null check (entity_type in ('projects', 'credits', 'documents')),
  from_state text not null,
  to_state text not null,
  allowed_roles text[] not null default '{}',
  unique (entity_type, from_state, to_state)
);

-- Reset seed safely.
delete from public.workflow_transitions
where entity_type in ('projects', 'credits', 'documents');

-- Projects
insert into public.workflow_transitions (entity_type, from_state, to_state, allowed_roles) values
  ('projects', 'draft', 'ready', array['project_admin', 'super_admin', 'super_user', 'admin']),
  ('projects', 'ready', 'active', array['project_admin', 'super_admin', 'super_user', 'admin']),
  ('projects', 'active', 'on_hold', array['project_admin', 'super_admin', 'super_user', 'owner', 'admin']),
  ('projects', 'on_hold', 'active', array['project_admin', 'super_admin', 'super_user', 'owner', 'admin']),
  ('projects', 'active', 'completed', array['project_admin', 'super_admin', 'super_user', 'admin']),
  ('projects', 'completed', 'archived', array['project_admin', 'super_admin', 'super_user', 'admin']);

-- Credits
insert into public.workflow_transitions (entity_type, from_state, to_state, allowed_roles) values
  ('credits', 'draft', 'assigned', array['project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'pending', 'in_progress', array['consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'pending', 'blocked', array['owner', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'pending', 'complete', array['project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'assigned', 'in_progress', array['consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'in_progress', 'submitted', array['consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'submitted', 'under_review', array['owner', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'under_review', 'approved', array['project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'under_review', 'rejected', array['owner', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'rejected', 'in_progress', array['consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'approved', 'closed', array['project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'in_progress', 'blocked', array['owner', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'in_progress', 'complete', array['project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'blocked', 'in_progress', array['consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'blocked', 'complete', array['project_admin', 'super_admin', 'super_user', 'admin']),
  ('credits', 'complete', 'blocked', array['owner', 'project_admin', 'super_admin', 'super_user', 'admin']);

-- Documents
insert into public.workflow_transitions (entity_type, from_state, to_state, allowed_roles) values
  ('documents', 'uploaded', 'tagged', array['consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('documents', 'uploaded', 'owner_approved', array['owner', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('documents', 'uploaded', 'submitted', array['consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('documents', 'tagged', 'submitted', array['consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('documents', 'submitted', 'under_review', array['owner', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('documents', 'under_review', 'approved', array['project_admin', 'super_admin', 'super_user', 'admin']),
  ('documents', 'under_review', 'rejected', array['owner', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('documents', 'owner_approved', 'approved', array['project_admin', 'super_admin', 'super_user', 'admin']),
  ('documents', 'owner_approved', 'rejected', array['project_admin', 'super_admin', 'super_user', 'admin']),
  ('documents', 'rejected', 'revised', array['consultant', 'architect', 'mep', 'contractor', 'owner', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('documents', 'rejected', 'uploaded', array['consultant', 'architect', 'mep', 'contractor', 'owner', 'project_admin', 'super_admin', 'super_user', 'admin']),
  ('documents', 'revised', 'submitted', array['consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'super_user', 'admin']);

create index if not exists workflow_transitions_entity_idx
  on public.workflow_transitions (entity_type, from_state, to_state);

alter table public.workflow_transitions enable row level security;
drop policy if exists "workflow_transitions_read_all_authenticated" on public.workflow_transitions;
create policy "workflow_transitions_read_all_authenticated"
  on public.workflow_transitions
  for select
  using (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- Audit table enrichment
-- ---------------------------------------------------------------------------
-- workflow_logs alteration moved to 0126

-- Trigger function: transition + role + dependency + audit
-- ---------------------------------------------------------------------------
create or replace function public.resolve_workflow_actor_role(
  p_entity_type text,
  p_project_id uuid
)
returns text
language plpgsql
stable
as $$
declare
  v_uid uuid;
  v_role text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return null;
  end if;

  -- Global profile role has precedence for super roles.
  select p.global_role
    into v_role
  from public.profiles p
  where p.user_id = v_uid
    and p.global_role in ('super_user', 'super_admin', 'project_admin', 'admin')
  limit 1;
  if v_role is not null then
    return v_role;
  end if;

  select pm.role
    into v_role
  from public.project_members pm
  where pm.project_id = p_project_id
    and pm.user_id = v_uid
  order by pm.created_at asc
  limit 1;

  return v_role;
end;
$$;

create or replace function public.validate_workflow_transition()
returns trigger
language plpgsql
as $$
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
  if new.status is not distinct from old.status then
    return new;
  end if;

  v_from_state := old.status::text;
  v_to_state := new.status::text;
  v_actor_id := auth.uid();
  v_is_override := coalesce(current_setting('app.override', true), 'false') = 'true';
  v_override_reason := nullif(current_setting('app.override_reason', true), '');

  if tg_table_name = 'projects' then
    v_project_id := new.id;
  elsif tg_table_name = 'credits' then
    v_project_id := new.project_id;
  elsif tg_table_name = 'documents' then
    v_project_id := new.project_id;
  end if;

  v_actor_role := coalesce(nullif(current_setting('app.current_user_role', true), ''), public.resolve_workflow_actor_role(tg_table_name, v_project_id));

  if v_actor_role is null then
    raise exception 'Workflow role context missing for transition % -> % on %', v_from_state, v_to_state, tg_table_name;
  end if;

  -- Soft override path (admin-only, mandatory reason).
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
      where wt.entity_type = tg_table_name
        and wt.from_state = v_from_state
        and wt.to_state = v_to_state
        and v_actor_role = any(wt.allowed_roles)
    )
      into v_allowed;

    if not coalesce(v_allowed, false) then
      raise exception 'Invalid transition or role not allowed: % % -> % by role %', tg_table_name, v_from_state, v_to_state, v_actor_role;
    end if;
  end if;

  -- Dependency enforcement: credits cannot be closed unless all linked docs approved.
  if tg_table_name = 'credits' and v_to_state in ('closed', 'complete') and not v_is_override then
    if exists (
      select 1
      from public.documents d
      where d.credit_id = new.id
        and d.status <> 'approved'::public.document_state_enum
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
$$;

drop trigger if exists projects_workflow_transition_guard on public.projects;
create trigger projects_workflow_transition_guard
before update of status on public.projects
for each row
execute function public.validate_workflow_transition();

drop trigger if exists credits_workflow_transition_guard on public.credits;
create trigger credits_workflow_transition_guard
before update of status on public.credits
for each row
execute function public.validate_workflow_transition();

drop trigger if exists documents_workflow_transition_guard on public.documents;
create trigger documents_workflow_transition_guard
before update of status on public.documents
for each row
execute function public.validate_workflow_transition();

-- ---------------------------------------------------------------------------
-- RLS policy adjustments for workflow-driven updates through authenticated user
-- ---------------------------------------------------------------------------
drop policy if exists documents_update_reviewers on public.documents;
drop policy if exists documents_update_consultant on public.documents;
create policy "documents_update_workflow_members"
on public.documents for update
to authenticated
using (
  public.has_project_role(project_id, array['owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'admin'])
)
with check (
  public.has_project_role(project_id, array['owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'admin'])
);

drop policy if exists credits_update_consultant on public.credits;
create policy "credits_update_workflow_members"
on public.credits for update
to authenticated
using (
  public.has_project_role(project_id, array['owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'admin'])
)
with check (
  public.has_project_role(project_id, array['owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'admin'])
);

drop policy if exists projects_update_workflow_admins on public.projects;
create policy "projects_update_workflow_admins"
on public.projects for update
to authenticated
using (
  public.has_project_role(id, array['project_admin', 'super_admin', 'admin'])
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.global_role in ('super_user', 'super_admin', 'project_admin', 'admin')
  )
)
with check (
  public.has_project_role(id, array['project_admin', 'super_admin', 'admin'])
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.global_role in ('super_user', 'super_admin', 'project_admin', 'admin')
  )
);
