do $$
begin
  if not exists (select 1 from pg_type where typname = 'workflow_state') then
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
  add column if not exists workflow_state public.workflow_state not null default 'DRAFT'::public.workflow_state;

create table if not exists public.document_states (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  state public.workflow_state not null,
  previous_state public.workflow_state,
  transition_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists document_states_document_id_idx
  on public.document_states (document_id, updated_at desc);

alter table public.document_states enable row level security;

drop policy if exists "document_states_select_project_members" on public.document_states;
create policy "document_states_select_project_members"
  on public.document_states
  for select
  using (
    exists (
      select 1
      from public.documents d
      where d.id = document_states.document_id
        and public.is_project_member(d.project_id)
    )
  );

drop policy if exists "document_states_insert_authenticated" on public.document_states;
create policy "document_states_insert_authenticated"
  on public.document_states
  for insert
  with check (auth.uid() is not null or auth.role() = 'service_role');

-- Backfill document workflow states from legacy status values.
update public.documents
set workflow_state = case
  when status::text in ('approved') then 'APPROVED'::public.workflow_state
  when status::text in ('rejected') then 'REJECTED'::public.workflow_state
  when status::text in ('owner_approved', 'under_review') then 'UNDER_REVIEW'::public.workflow_state
  when status::text in ('uploaded', 'tagged') then 'READY'::public.workflow_state
  else 'DRAFT'::public.workflow_state
end;

insert into public.document_states (document_id, state, previous_state, transition_by)
select d.id, d.workflow_state, null, d.uploaded_by
from public.documents d
where not exists (
  select 1
  from public.document_states ds
  where ds.document_id = d.id
);
