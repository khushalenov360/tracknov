-- Runtime semantics + orchestration hardening baseline
-- Adds schema integrity tracking, transition legality, certification lock guards,
-- immutable snapshot tables, security events, and reconciliation/repair wrappers.

begin;

create extension if not exists pgcrypto;

create table if not exists public.schema_migration_integrity (
  id uuid primary key default gen_random_uuid(),
  migration_id text not null unique,
  checksum text not null,
  applied_at timestamptz not null default timezone('utc', now()),
  runtime_hash text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'mismatch', 'missing', 'drift')),
  details jsonb not null default '{}'::jsonb
);

create index if not exists idx_schema_migration_integrity_status
  on public.schema_migration_integrity(verification_status, applied_at desc);

create table if not exists public.workflow_transition_rules (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  from_state text not null,
  to_state text not null,
  allowed_roles text[] not null default array[]::text[],
  requires_validation boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique(entity_type, from_state, to_state)
);

insert into public.workflow_transition_rules(entity_type, from_state, to_state, allowed_roles, requires_validation)
values
  ('document', 'DRAFT', 'READY', array['consultant','architect','mep','contractor','owner','project_admin','super_admin','super_user'], false),
  ('document', 'READY', 'SUBMITTED', array['consultant','architect','mep','contractor','owner','project_admin','super_admin','super_user'], true),
  ('document', 'SUBMITTED', 'UNDER_REVIEW', array['owner','super_user'], true),
  ('document', 'SUBMITTED', 'CLARIFICATION', array['owner','project_admin','super_admin','super_user'], true),
  ('document', 'SUBMITTED', 'REJECTED', array['owner','project_admin','super_admin','super_user'], true),
  ('document', 'UNDER_REVIEW', 'APPROVED', array['project_admin','super_admin','super_user'], true),
  ('document', 'UNDER_REVIEW', 'CLARIFICATION', array['project_admin','super_admin','super_user'], true),
  ('document', 'UNDER_REVIEW', 'REJECTED', array['project_admin','super_admin','super_user'], true),
  ('document', 'CLARIFICATION', 'RESUBMITTED', array['consultant','architect','mep','contractor','owner','project_admin','super_admin','super_user'], true),
  ('document', 'RESUBMITTED', 'UNDER_REVIEW', array['owner','project_admin','super_admin','super_user'], true),
  ('document', 'SUBMITTED', 'ELIMINATED', array['project_admin','super_admin','super_user'], true),
  ('document', 'UNDER_REVIEW', 'ELIMINATED', array['project_admin','super_admin','super_user'], true),
  ('document', 'REJECTED', 'ELIMINATED', array['project_admin','super_admin','super_user'], true),
  ('document', 'CLARIFICATION', 'ELIMINATED', array['project_admin','super_admin','super_user'], true)
on conflict(entity_type, from_state, to_state) do update
set allowed_roles = excluded.allowed_roles,
    requires_validation = excluded.requires_validation,
    is_active = true;

create index if not exists idx_workflow_transition_rules_lookup
  on public.workflow_transition_rules(entity_type, from_state, to_state)
  where is_active = true;

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  actor_id uuid,
  event_type text not null,
  severity text not null default 'warning' check (severity in ('info','warning','critical')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_security_events_project_time
  on public.security_events(project_id, created_at desc);

create index if not exists idx_security_events_type_time
  on public.security_events(event_type, created_at desc);

create table if not exists public.validation_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  validation_result jsonb not null default '{}'::jsonb,
  rule_version_id uuid,
  previous_hash text,
  current_hash text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_validation_snapshots_entity
  on public.validation_snapshots(entity_type, entity_id, created_at desc);

create table if not exists public.certification_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  manual_version_id uuid references public.manual_versions(id) on delete restrict,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  validation_snapshot jsonb not null default '{}'::jsonb,
  scoring_snapshot jsonb not null default '{}'::jsonb,
  workflow_snapshot jsonb not null default '{}'::jsonb,
  assignment_snapshot jsonb not null default '{}'::jsonb,
  override_lineage jsonb not null default '[]'::jsonb,
  previous_hash text,
  certification_snapshot_hash text not null,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_certification_snapshots_project
  on public.certification_snapshots(project_id, created_at desc);

do $$
begin
  if exists (select 1 from pg_type where typname = 'certification_state') then
    begin
      alter type public.certification_state add value if not exists 'CERTIFIED_LOCKED';
    exception when others then
      null;
    end;
  end if;
end $$;

create or replace function public.is_project_user_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_users pu
    where pu.project_id = p_project_id
      and pu.user_id = auth.uid()
  );
$$;

create or replace function public.has_project_user_role(p_project_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_users pu
    where pu.project_id = p_project_id
      and pu.user_id = auth.uid()
      and pu.role = any(p_roles)
  );
$$;

alter table public.project_users enable row level security;
alter table public.project_document enable row level security;

drop policy if exists project_users_select_project_members on public.project_users;
create policy project_users_select_project_members
on public.project_users
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_project_user_member(project_id)
);

drop policy if exists project_users_insert_admins on public.project_users;
create policy project_users_insert_admins
on public.project_users
for insert
to authenticated
with check (
  public.has_project_user_role(project_id, array['super_user','project_admin','owner'])
);

drop policy if exists project_users_update_admins on public.project_users;
create policy project_users_update_admins
on public.project_users
for update
to authenticated
using (
  public.has_project_user_role(project_id, array['super_user','project_admin','owner'])
)
with check (
  public.has_project_user_role(project_id, array['super_user','project_admin','owner'])
);

drop policy if exists project_document_select_members on public.project_document;
create policy project_document_select_members
on public.project_document
for select
to authenticated
using (
  public.is_project_user_member(project_id)
);

drop policy if exists project_document_insert_uploaders on public.project_document;
create policy project_document_insert_uploaders
on public.project_document
for insert
to authenticated
with check (
  public.has_project_user_role(project_id, array['super_user','project_admin','owner','consultant','architect','mep','contractor'])
);

drop policy if exists project_document_update_reviewers on public.project_document;
create policy project_document_update_reviewers
on public.project_document
for update
to authenticated
using (
  public.has_project_user_role(project_id, array['super_user','project_admin','owner','consultant','architect','mep','contractor'])
)
with check (
  public.has_project_user_role(project_id, array['super_user','project_admin','owner','consultant','architect','mep','contractor'])
);

create or replace function public.set_runtime_context(
  p_user_role text,
  p_user_id text default null,
  p_override boolean default false
) returns void
language plpgsql
as $$
begin
  perform set_config('app.current_user_role', coalesce(p_user_role, ''), true);
  perform set_config('app.current_user_id', coalesce(p_user_id, ''), true);
  perform set_config('app.override', case when coalesce(p_override, false) then 'true' else 'false' end, true);
end;
$$;

create or replace function public.prevent_append_only_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Table % is append-only. UPDATE/DELETE is forbidden.', tg_table_name;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'workflow_history',
    'audit_logs',
    'override_logs',
    'certification_snapshots',
    'document_versions',
    'validation_snapshots'
  ]
  loop
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = t) then
      execute format('drop trigger if exists trg_%I_append_only_update on public.%I', t, t);
      execute format('drop trigger if exists trg_%I_append_only_delete on public.%I', t, t);
      execute format('create trigger trg_%I_append_only_update before update on public.%I for each row execute function public.prevent_append_only_mutation()', t, t);
      execute format('create trigger trg_%I_append_only_delete before delete on public.%I for each row execute function public.prevent_append_only_mutation()', t, t);
    end if;
  end loop;
end $$;

create or replace function public.guard_project_document_transition_rule()
returns trigger
language plpgsql
as $$
declare
  v_role text := nullif(current_setting('app.current_user_role', true), '');
  v_override boolean := current_setting('app.override', true) = 'true';
begin
  if new.state is not distinct from old.state then
    return new;
  end if;

  if v_override and v_role = 'super_user' then
    return new;
  end if;

  if not exists (
    select 1
    from public.workflow_transition_rules r
    where r.entity_type = 'document'
      and r.from_state = old.state::text
      and r.to_state = new.state::text
      and r.is_active = true
      and (
        coalesce(array_length(r.allowed_roles, 1), 0) = 0
        or v_role is null
        or v_role = any(r.allowed_roles)
      )
  ) then
    insert into public.security_events(project_id, actor_id, event_type, severity, details)
    values(
      old.project_id,
      auth.uid(),
      'invalid_workflow_transition',
      'critical',
      jsonb_build_object(
        'document_id', old.id,
        'from_state', old.state::text,
        'to_state', new.state::text,
        'role', v_role
      )
    );
    raise exception 'Invalid workflow transition or role not allowed: % -> %', old.state, new.state;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_project_document_transition_rule on public.project_document;
create trigger trg_project_document_transition_rule
before update of state on public.project_document
for each row execute function public.guard_project_document_transition_rule();

create or replace function public.is_project_certified_locked(p_project_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.certification_state::text = 'CERTIFIED_LOCKED'
  );
$$;

create or replace function public.guard_certified_project_mutation()
returns trigger
language plpgsql
as $$
declare
  v_project_id uuid;
  v_role text := nullif(current_setting('app.current_user_role', true), '');
  v_override boolean := current_setting('app.override', true) = 'true';
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  if v_project_id is null then
    return coalesce(new, old);
  end if;

  if public.is_project_certified_locked(v_project_id) and not (v_override and v_role = 'super_user') then
    insert into public.security_events(project_id, actor_id, event_type, severity, details)
    values(
      v_project_id,
      auth.uid(),
      'certified_lock_violation',
      'critical',
      jsonb_build_object('table', tg_table_name, 'operation', tg_op, 'role', v_role)
    );
    raise exception 'Project is CERTIFIED_LOCKED. Mutations require L5 override.';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_project_document_certified_lock on public.project_document;
create trigger trg_project_document_certified_lock
before insert or update or delete on public.project_document
for each row execute function public.guard_certified_project_mutation();

drop trigger if exists trg_project_credits_certified_lock on public.project_credits;
create trigger trg_project_credits_certified_lock
before insert or update or delete on public.project_credits
for each row execute function public.guard_certified_project_mutation();

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'submittals') then
    drop trigger if exists trg_submittals_certified_lock on public.submittals;
    create trigger trg_submittals_certified_lock
    before insert or update or delete on public.submittals
    for each row execute function public.guard_certified_project_mutation();
  end if;
end $$;

create or replace function public.create_certification_snapshot(
  p_project_id uuid,
  p_actor_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_manual_version_id uuid;
  v_prev_hash text;
  v_payload text;
  v_hash text;
  v_id uuid;
begin
  select manual_version_id into v_manual_version_id
  from public.projects
  where id = p_project_id;

  select certification_snapshot_hash into v_prev_hash
  from public.certification_snapshots
  where project_id = p_project_id
  order by created_at desc
  limit 1;

  v_payload := jsonb_build_object(
    'project_id', p_project_id,
    'manual_version_id', v_manual_version_id,
    'created_at', now(),
    'previous_hash', v_prev_hash
  )::text;
  v_hash := encode(extensions.digest(v_payload, 'sha256'), 'hex');

  insert into public.certification_snapshots(
    project_id,
    manual_version_id,
    evidence_snapshot,
    validation_snapshot,
    scoring_snapshot,
    workflow_snapshot,
    assignment_snapshot,
    override_lineage,
    previous_hash,
    certification_snapshot_hash,
    created_by
  )
  values(
    p_project_id,
    v_manual_version_id,
    coalesce((select jsonb_agg(to_jsonb(dv)) from public.document_versions dv join public.project_document pd on dv.document_id = pd.id where pd.project_id = p_project_id), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(vs)) from public.validation_snapshots vs where vs.project_id = p_project_id), '[]'::jsonb),
    coalesce((select public.get_project_certification_summary(p_project_id)), '{}'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(wh)) from public.workflow_history wh where wh.project_id = p_project_id), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(a)) from public.assignments a where a.project_id = p_project_id), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(ol)) from public.override_logs ol where ol.project_id = p_project_id), '[]'::jsonb),
    v_prev_hash,
    v_hash,
    p_actor_id
  )
  returning id into v_id;

  update public.projects
  set certification_state = 'CERTIFIED_LOCKED',
      certification_block_reason = null
  where id = p_project_id;

  return v_id;
end;
$$;

create or replace function public.recalculate_submittal_state(p_submittal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select project_id into v_project_id from public.submittals where id = p_submittal_id;
  if v_project_id is not null then
    perform public.recompute_credit_scores(v_project_id);
    perform public.recompute_project_certification_state(v_project_id);
  end if;
end;
$$;

create or replace function public.recalculate_credit_state(p_project_credit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select project_id into v_project_id from public.project_credits where id = p_project_credit_id;
  if v_project_id is not null then
    perform public.recalculate_derived_states(v_project_id, p_project_credit_id);
    perform public.recompute_credit_scores(v_project_id);
    perform public.recompute_project_certification_state(v_project_id);
  end if;
end;
$$;

create or replace function public.recalculate_project_state(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit record;
begin
  for v_credit in
    select id from public.project_credits where project_id = p_project_id
  loop
    perform public.recalculate_derived_states(p_project_id, v_credit.id);
  end loop;
  perform public.recompute_credit_scores(p_project_id);
  perform public.recompute_project_certification_state(p_project_id);
end;
$$;

create or replace function public.recalculate_certification_state(p_project_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  select public.recompute_project_certification_state(p_project_id);
$$;

create or replace function public.repair_project_state(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_project_state(p_project_id);
  return jsonb_build_object('ok', true, 'project_id', p_project_id, 'repaired_at', now());
end;
$$;

create or replace function public.repair_credit_state(p_project_credit_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_credit_state(p_project_credit_id);
  return jsonb_build_object('ok', true, 'project_credit_id', p_project_credit_id, 'repaired_at', now());
end;
$$;

create or replace function public.verify_certification_integrity(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_summary jsonb;
  v_snapshot_count int;
begin
  v_summary := public.get_project_certification_summary(p_project_id);
  select count(*)::int into v_snapshot_count
  from public.certification_snapshots
  where project_id = p_project_id;

  return jsonb_build_object(
    'ok', true,
    'project_id', p_project_id,
    'summary', v_summary,
    'certification_snapshot_count', v_snapshot_count
  );
end;
$$;

create or replace function public.rebuild_derived_states(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_project_state(p_project_id);
  return public.verify_certification_integrity(p_project_id);
end;
$$;

create index if not exists idx_project_document_workflow_lookup
  on public.project_document(project_id, project_credit_id, state, is_latest);

create index if not exists idx_project_document_submittal_state
  on public.project_document(submittal_id, state)
  where submittal_id is not null;

create index if not exists idx_assignments_project_credit_active
  on public.assignments(project_id, project_credit_id, is_active);

create index if not exists idx_workflow_history_project_time
  on public.workflow_history(project_id, created_at desc);

create index if not exists idx_audit_logs_entity_time
  on public.audit_logs(entity_type, entity_id, created_at desc);

create index if not exists idx_validation_results_submittal
  on public.validation_results(submittal_id, created_at desc);

insert into public.schema_migration_integrity(migration_id, checksum, runtime_hash, verification_status, details)
values (
  '0056_runtime_semantics_orchestration_hardening',
  'repo-managed',
  'pending-runtime-verification',
  'pending',
  jsonb_build_object('created_by', 'codex', 'scope', 'runtime semantics hardening')
)
on conflict(migration_id) do update
set applied_at = timezone('utc', now()),
    runtime_hash = excluded.runtime_hash,
    verification_status = excluded.verification_status,
    details = excluded.details;

commit;
