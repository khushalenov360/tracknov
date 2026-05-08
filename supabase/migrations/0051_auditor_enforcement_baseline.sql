-- Auditor baseline hardening
-- 1) ELIMINATED terminal state support
-- 2) Assignment strictness
-- 3) Append-only immutable logs
-- 4) Version/audit lineage append tables
-- 5) Derived state recalculation hooks

do $$
begin
  if exists (select 1 from pg_type where typname = 'workflow_state') then
    begin
      alter type public.workflow_state add value if not exists 'ELIMINATED';
    exception when others then
      null;
    end;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_document'
      and column_name = 'state'
  ) then
    begin
      alter table public.project_document
        alter column state type public.workflow_state
        using upper(coalesce(state::text, 'DRAFT'))::public.workflow_state;
    exception when others then
      null;
    end;
  end if;
end $$;

alter table public.project_document
  add column if not exists rejection_count integer not null default 0;

alter table public.project_document
  add constraint project_document_rejection_count_chk
  check (rejection_count >= 0);

create unique index if not exists uq_assignments_single_active_owner_per_credit
  on public.assignments(project_credit_id)
  where is_active = true;

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.project_document(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_credit_id uuid references public.project_credits(id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_type text,
  doc_category text,
  version integer not null,
  parent_document_id uuid,
  state text,
  uploaded_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.assignment_logs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid,
  project_id uuid,
  project_credit_id uuid,
  old_user_id uuid,
  new_user_id uuid,
  old_role text,
  new_role text,
  action text not null,
  reason text,
  actor_id uuid,
  actor_role text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workflow_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  document_id uuid,
  project_credit_id uuid,
  from_state text,
  to_state text,
  actor_id uuid,
  actor_role text,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor_id uuid,
  actor_role text,
  summary text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.prevent_row_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Table % is append-only. UPDATE/DELETE is forbidden.', tg_table_name;
end;
$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='audit_logs') then
    drop trigger if exists trg_audit_logs_append_only_update on public.audit_logs;
    drop trigger if exists trg_audit_logs_append_only_delete on public.audit_logs;
    create trigger trg_audit_logs_append_only_update before update on public.audit_logs
      for each row execute function public.prevent_row_mutation();
    create trigger trg_audit_logs_append_only_delete before delete on public.audit_logs
      for each row execute function public.prevent_row_mutation();
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='workflow_history') then
    drop trigger if exists trg_workflow_history_append_only_update on public.workflow_history;
    drop trigger if exists trg_workflow_history_append_only_delete on public.workflow_history;
    create trigger trg_workflow_history_append_only_update before update on public.workflow_history
      for each row execute function public.prevent_row_mutation();
    create trigger trg_workflow_history_append_only_delete before delete on public.workflow_history
      for each row execute function public.prevent_row_mutation();
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='document_versions') then
    drop trigger if exists trg_document_versions_append_only_update on public.document_versions;
    drop trigger if exists trg_document_versions_append_only_delete on public.document_versions;
    create trigger trg_document_versions_append_only_update before update on public.document_versions
      for each row execute function public.prevent_row_mutation();
    create trigger trg_document_versions_append_only_delete before delete on public.document_versions
      for each row execute function public.prevent_row_mutation();
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='assignment_logs') then
    drop trigger if exists trg_assignment_logs_append_only_update on public.assignment_logs;
    drop trigger if exists trg_assignment_logs_append_only_delete on public.assignment_logs;
    create trigger trg_assignment_logs_append_only_update before update on public.assignment_logs
      for each row execute function public.prevent_row_mutation();
    create trigger trg_assignment_logs_append_only_delete before delete on public.assignment_logs
      for each row execute function public.prevent_row_mutation();
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='override_logs') then
    drop trigger if exists trg_override_logs_append_only_update on public.override_logs;
    drop trigger if exists trg_override_logs_append_only_delete on public.override_logs;
    create trigger trg_override_logs_append_only_update before update on public.override_logs
      for each row execute function public.prevent_row_mutation();
    create trigger trg_override_logs_append_only_delete before delete on public.override_logs
      for each row execute function public.prevent_row_mutation();
  end if;
end $$;

create or replace function public.sync_document_version_history()
returns trigger
language plpgsql
as $$
begin
  insert into public.document_versions(
    document_id, project_id, project_credit_id, file_name, file_path, file_type,
    doc_category, version, parent_document_id, state, uploaded_by
  )
  values(
    new.id, new.project_id, new.project_credit_id, new.file_name, new.file_path, new.file_type,
    new.doc_category, coalesce(new.version, 1), new.parent_document_id, new.state::text, new.uploaded_by
  );
  return new;
end;
$$;

drop trigger if exists trg_project_document_version_insert on public.project_document;
create trigger trg_project_document_version_insert
after insert on public.project_document
for each row execute function public.sync_document_version_history();

create or replace function public.prevent_document_overwrite()
returns trigger
language plpgsql
as $$
begin
  if new.file_path is distinct from old.file_path then
    raise exception 'Document file overwrite is forbidden. Create a new version instead.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_project_document_no_overwrite on public.project_document;
create trigger trg_project_document_no_overwrite
before update of file_path on public.project_document
for each row execute function public.prevent_document_overwrite();

create or replace function public.guard_assignment_before_upload()
returns trigger
language plpgsql
as $$
declare
  v_assigned uuid;
begin
  select pc.assigned_user_id into v_assigned
  from public.project_credits pc
  where pc.id = new.project_credit_id;

  if v_assigned is null then
    raise exception 'Assignment required before upload for this project credit.';
  end if;

  if new.uploaded_by is distinct from v_assigned then
    raise exception 'Only the assigned owner can upload for this project credit.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_project_document_assignment_guard on public.project_document;
create trigger trg_project_document_assignment_guard
before insert on public.project_document
for each row execute function public.guard_assignment_before_upload();

create or replace function public.log_assignment_changes()
returns trigger
language plpgsql
as $$
declare
  v_actor_id uuid;
  v_actor_role text;
begin
  v_actor_id := auth.uid();
  v_actor_role := nullif(current_setting('app.current_user_role', true), '');
  if tg_op = 'INSERT' then
    insert into public.assignment_logs(
      assignment_id, project_id, project_credit_id, old_user_id, new_user_id,
      old_role, new_role, action, reason, actor_id, actor_role
    )
    values(
      new.id, new.project_id, new.project_credit_id, null, new.user_id,
      null, new.role, 'assigned', null, v_actor_id, v_actor_role
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.assignment_logs(
      assignment_id, project_id, project_credit_id, old_user_id, new_user_id,
      old_role, new_role, action, reason, actor_id, actor_role
    )
    values(
      new.id, new.project_id, new.project_credit_id, old.user_id, new.user_id,
      old.role, new.role, 'reassigned', null, v_actor_id, v_actor_role
    );
    return new;
  else
    insert into public.assignment_logs(
      assignment_id, project_id, project_credit_id, old_user_id, new_user_id,
      old_role, new_role, action, reason, actor_id, actor_role
    )
    values(
      old.id, old.project_id, old.project_credit_id, old.user_id, null,
      old.role, null, 'unassigned', null, v_actor_id, v_actor_role
    );
    return old;
  end if;
end;
$$;

drop trigger if exists trg_assignments_change_log_insert on public.assignments;
drop trigger if exists trg_assignments_change_log_update on public.assignments;
drop trigger if exists trg_assignments_change_log_delete on public.assignments;
create trigger trg_assignments_change_log_insert
after insert on public.assignments
for each row execute function public.log_assignment_changes();
create trigger trg_assignments_change_log_update
after update on public.assignments
for each row execute function public.log_assignment_changes();
create trigger trg_assignments_change_log_delete
after delete on public.assignments
for each row execute function public.log_assignment_changes();

create or replace function public.guard_l0_assignment_mutation()
returns trigger
language plpgsql
as $$
declare
  v_actor_role text;
  v_actor_id uuid;
begin
  v_actor_role := lower(coalesce(nullif(current_setting('app.current_user_role', true), ''), ''));
  v_actor_id := auth.uid();
  if v_actor_role in ('consultant', 'architect', 'mep', 'contractor') then
    raise exception 'L0 roles cannot create or mutate assignments.';
  end if;
  if tg_op in ('INSERT','UPDATE') and v_actor_id is not null and new.user_id = v_actor_id and v_actor_role in ('owner') then
    raise exception 'Self-assignment is not permitted.';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_assignments_guard_l0_insert on public.assignments;
drop trigger if exists trg_assignments_guard_l0_update on public.assignments;
drop trigger if exists trg_assignments_guard_l0_delete on public.assignments;
create trigger trg_assignments_guard_l0_insert
before insert on public.assignments
for each row execute function public.guard_l0_assignment_mutation();
create trigger trg_assignments_guard_l0_update
before update on public.assignments
for each row execute function public.guard_l0_assignment_mutation();
create trigger trg_assignments_guard_l0_delete
before delete on public.assignments
for each row execute function public.guard_l0_assignment_mutation();

create or replace function public.write_workflow_history()
returns trigger
language plpgsql
as $$
declare
  v_actor_role text;
begin
  if new.state is distinct from old.state then
    v_actor_role := nullif(current_setting('app.current_user_role', true), '');
    insert into public.workflow_history(
      project_id, document_id, project_credit_id, from_state, to_state, actor_id, actor_role
    )
    values(
      new.project_id, new.id, new.project_credit_id, old.state::text, new.state::text, auth.uid(), v_actor_role
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_project_document_workflow_history on public.project_document;
create trigger trg_project_document_workflow_history
after update of state on public.project_document
for each row execute function public.write_workflow_history();

create or replace function public.recalculate_derived_states(
  p_project_id uuid,
  p_project_credit_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_total int := 0;
  v_approved int := 0;
begin
  -- Credit-level derivation
  select
    count(*)::int,
    count(*) filter (where upper(coalesce(state::text,'')) = 'APPROVED')::int
  into v_total, v_approved
  from public.project_document
  where project_credit_id = p_project_credit_id
    and coalesce(is_latest, true) = true
    and upper(coalesce(state::text,'')) <> 'ELIMINATED';

  update public.project_credits pc
  set state =
    case
      when v_total = 0 then 'PENDING'
      when v_total > 0 and v_approved = v_total then 'COMPLETE'
      else 'IN_PROGRESS'
    end,
    completion_pct =
    case
      when v_total = 0 then 0
      else round((v_approved::numeric / v_total::numeric) * 100)
    end,
    updated_at = timezone('utc', now())
  where pc.id = p_project_credit_id;

  -- Project-level coarse derivation
  update public.projects p
  set status =
    case
      when exists (
        select 1
        from public.project_credits c
        where c.project_id = p.id
          and upper(coalesce(c.state::text,'')) not in ('COMPLETE','CLOSED','APPROVED')
      ) then 'active'
      else 'completed'
    end
  where p.id = p_project_id;
end;
$$;

create or replace function public.recalc_derived_states_on_doc_change()
returns trigger
language plpgsql
as $$
declare
  v_project_id uuid;
  v_project_credit_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  v_project_credit_id := coalesce(new.project_credit_id, old.project_credit_id);
  if v_project_id is not null and v_project_credit_id is not null then
    perform public.recalculate_derived_states(v_project_id, v_project_credit_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_project_document_recalc_derived_states on public.project_document;
create trigger trg_project_document_recalc_derived_states
after insert or update of state, is_latest, project_credit_id on public.project_document
for each row execute function public.recalc_derived_states_on_doc_change();
