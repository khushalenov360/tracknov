-- P0 hardening: enforce document.workflow_state transitions at DB layer

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'workflow_state'
  ) then
    create type public.workflow_state as enum (
      'DRAFT',
      'READY',
      'SUBMITTED',
      'UNDER_REVIEW',
      'CLARIFICATION',
      'RESUBMITTED',
      'APPROVED',
      'REJECTED'
    );
  end if;
end $$;

alter table public.documents
  alter column workflow_state type public.workflow_state
  using upper(coalesce(workflow_state::text, 'READY'))::public.workflow_state;

create table if not exists public.workflow_state_transitions (
  id bigserial primary key,
  from_state public.workflow_state not null,
  to_state public.workflow_state not null,
  unique (from_state, to_state)
);

delete from public.workflow_state_transitions;

insert into public.workflow_state_transitions (from_state, to_state) values
  ('DRAFT', 'READY'),
  ('READY', 'SUBMITTED'),
  ('SUBMITTED', 'UNDER_REVIEW'),
  ('SUBMITTED', 'CLARIFICATION'),
  ('SUBMITTED', 'REJECTED'),
  ('UNDER_REVIEW', 'APPROVED'),
  ('UNDER_REVIEW', 'CLARIFICATION'),
  ('UNDER_REVIEW', 'REJECTED'),
  ('CLARIFICATION', 'RESUBMITTED'),
  ('RESUBMITTED', 'UNDER_REVIEW');

create or replace function public.validate_document_workflow_state_transition()
returns trigger
language plpgsql
as $$
begin
  if new.workflow_state is not distinct from old.workflow_state then
    return new;
  end if;

  if not exists (
    select 1
    from public.workflow_state_transitions t
    where t.from_state = old.workflow_state
      and t.to_state = new.workflow_state
  ) then
    raise exception 'Invalid workflow_state transition: % -> %', old.workflow_state, new.workflow_state;
  end if;

  return new;
end;
$$;

drop trigger if exists documents_workflow_state_guard on public.documents;
create trigger documents_workflow_state_guard
before update of workflow_state on public.documents
for each row
execute function public.validate_document_workflow_state_transition();

