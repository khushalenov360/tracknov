-- Document requirement assignment granularity.
-- Project Admin/Super User can assign each required document slot to one L0 user or L1 owner.

alter table if exists public.assignments
  add column if not exists document_type text;

alter table if exists public.assignments
  drop constraint if exists assignments_project_credit_id_user_id_key;

drop index if exists public.uq_assignments_single_active_owner_per_credit;

create unique index if not exists uq_assignments_single_active_owner_per_credit_document
  on public.assignments(project_credit_id, coalesce(document_type, '__credit__'))
  where is_active = true;

create index if not exists idx_assignments_project_credit_document_active
  on public.assignments(project_id, project_credit_id, document_type, is_active);

drop function if exists public.is_assigned_user(uuid, uuid);

create or replace function public.is_assigned_user(
  p_project_credit_id uuid,
  p_user_id uuid,
  p_document_type text default null
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assignments a
    where a.project_credit_id = p_project_credit_id
      and a.user_id = p_user_id
      and a.is_active = true
      and (
        p_document_type is null
        or a.document_type = p_document_type
        or a.document_type is null
      )
  );
$$;

insert into public.schema_migration_integrity(migration_id, checksum, runtime_hash, verification_status, details)
values (
  '0058_document_requirement_assignments',
  'local',
  'document-requirement-assignment-granularity',
  'verified',
  jsonb_build_object('scope', 'assignments.document_type')
)
on conflict (migration_id) do update
set applied_at = timezone('utc', now()),
    runtime_hash = excluded.runtime_hash,
    verification_status = excluded.verification_status,
    details = excluded.details;
