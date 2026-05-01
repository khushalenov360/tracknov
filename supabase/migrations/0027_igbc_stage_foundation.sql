-- P0 IGBC foundation: stage-aware credit model (additive, non-breaking)

create table if not exists public.rating_systems (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.credits
  add column if not exists rating_system_id uuid references public.rating_systems(id) on delete set null,
  add column if not exists rating_system text;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'igbc_stage'
  ) then
    create type public.igbc_stage as enum ('DESIGN', 'CONSTRUCTION');
  end if;
end $$;

create table if not exists public.credit_stages (
  id uuid primary key default gen_random_uuid(),
  credit_id uuid not null references public.credits(id) on delete cascade,
  stage public.igbc_stage not null,
  state text not null default 'NOT_STARTED',
  version integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (credit_id, stage)
);

create table if not exists public.submittals (
  id uuid primary key default gen_random_uuid(),
  credit_stage_id uuid not null references public.credit_stages(id) on delete cascade,
  type text not null,
  required_flag boolean not null default true,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.documents
  add column if not exists credit_stage_id uuid references public.credit_stages(id) on delete set null,
  add column if not exists source_stage public.igbc_stage,
  add column if not exists source_version_id uuid references public.documents(id) on delete set null,
  add column if not exists inherited_flag boolean not null default false;

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version integer not null,
  file_path text not null,
  file_name text not null,
  workflow_state public.workflow_state,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default timezone('utc', now()),
  notes text,
  unique (document_id, version)
);

create index if not exists idx_credit_stages_credit on public.credit_stages(credit_id);
create index if not exists idx_credit_stages_stage on public.credit_stages(stage);
create index if not exists idx_submittals_credit_stage on public.submittals(credit_stage_id);
create index if not exists idx_documents_credit_stage on public.documents(credit_stage_id);
create index if not exists idx_documents_source_stage on public.documents(source_stage);
create index if not exists idx_document_versions_document on public.document_versions(document_id);

create or replace function public.enforce_document_credit_stage_mapping()
returns trigger as $$
declare
  stage_credit_id uuid;
begin
  if new.credit_stage_id is null then
    return new;
  end if;

  select credit_id into stage_credit_id
  from public.credit_stages
  where id = new.credit_stage_id;

  if stage_credit_id is null then
    raise exception 'Invalid credit_stage_id on document';
  end if;

  if new.credit_id is not null and new.credit_id <> stage_credit_id then
    raise exception 'Document credit_id does not match selected credit_stage_id';
  end if;

  if new.credit_id is null then
    new.credit_id := stage_credit_id;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists documents_credit_stage_enforcer on public.documents;
create trigger documents_credit_stage_enforcer
before insert or update on public.documents
for each row
execute function public.enforce_document_credit_stage_mapping();

-- Seed rating systems from existing credits/project usage
insert into public.rating_systems (name)
select distinct trim(c.rating_system)
from public.credits c
where c.rating_system is not null and trim(c.rating_system) <> ''
on conflict (name) do nothing;

update public.credits c
set rating_system_id = rs.id
from public.rating_systems rs
where c.rating_system_id is null
  and rs.name = c.rating_system;

-- Backfill stages for every existing credit
insert into public.credit_stages (credit_id, stage, state)
select c.id, s.stage::public.igbc_stage, 'NOT_STARTED'
from public.credits c
cross join (values ('DESIGN'), ('CONSTRUCTION')) as s(stage)
on conflict (credit_id, stage) do nothing;

-- Backfill document stage binding from existing document->credit relation
update public.documents d
set credit_stage_id = cs.id
from public.credit_stages cs
where d.credit_id = cs.credit_id
  and cs.stage = 'DESIGN'::public.igbc_stage
  and d.credit_stage_id is null;

-- Backfill historical versions from current document rows
insert into public.document_versions (document_id, version, file_path, file_name, workflow_state, uploaded_by, uploaded_at, notes)
select
  d.id,
  coalesce(d.version, 1),
  d.file_path,
  d.file_name,
  d.workflow_state,
  d.uploaded_by,
  d.uploaded_at,
  d.notes
from public.documents d
where d.file_path is not null
on conflict (document_id, version) do nothing;
