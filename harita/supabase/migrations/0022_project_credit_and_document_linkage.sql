-- P1: project->credit mapping + document->credit linkage/versioning baseline

create table if not exists public.project_credits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  credit_id uuid not null references public.credits(id) on delete cascade,
  status text not null default 'NOT_STARTED' check (status in ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED')),
  assigned_user_id uuid references auth.users(id) on delete set null,
  deadline_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(project_id, credit_id)
);

create index if not exists project_credits_project_idx on public.project_credits(project_id);
create index if not exists project_credits_status_idx on public.project_credits(status);

insert into public.project_credits (project_id, credit_id)
select c.project_id, c.id
from public.credits c
where not exists (
  select 1
  from public.project_credits pc
  where pc.project_id = c.project_id
    and pc.credit_id = c.id
);

alter table public.documents
  add column if not exists project_credit_id uuid references public.project_credits(id) on delete set null,
  add column if not exists version integer not null default 1,
  add column if not exists is_latest boolean not null default true,
  add column if not exists parent_document_id uuid references public.documents(id) on delete set null;

update public.documents d
set project_credit_id = pc.id
from public.project_credits pc
where d.project_credit_id is null
  and d.project_id = pc.project_id
  and d.credit_id = pc.credit_id;

with ranked as (
  select
    id,
    row_number() over (
      partition by project_credit_id, doc_category
      order by uploaded_at desc, id desc
    ) as rn
  from public.documents
  where project_credit_id is not null
)
update public.documents d
set is_latest = case when r.rn = 1 then true else false end
from ranked r
where d.id = r.id;

with ranked_versions as (
  select
    id,
    row_number() over (
      partition by project_credit_id, doc_category
      order by uploaded_at asc, id asc
    ) as version_no
  from public.documents
  where project_credit_id is not null
),
parents as (
  select
    curr.id as document_id,
    prev.id as parent_id
  from ranked_versions curr
  left join ranked_versions prev
    on prev.version_no = curr.version_no - 1
   and prev.id <> curr.id
)
update public.documents d
set version = rv.version_no
from ranked_versions rv
where d.id = rv.id;

with ranked_versions as (
  select
    id,
    project_credit_id,
    doc_category,
    row_number() over (
      partition by project_credit_id, doc_category
      order by uploaded_at asc, id asc
    ) as version_no
  from public.documents
  where project_credit_id is not null
),
version_with_parent as (
  select
    curr.id as id,
    prev.id as parent_id
  from ranked_versions curr
  left join ranked_versions prev
    on prev.project_credit_id = curr.project_credit_id
   and prev.doc_category = curr.doc_category
   and prev.version_no = curr.version_no - 1
)
update public.documents d
set parent_document_id = vwp.parent_id
from version_with_parent vwp
where d.id = vwp.id
  and d.parent_document_id is null;
