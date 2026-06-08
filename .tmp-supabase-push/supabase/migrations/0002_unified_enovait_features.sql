alter table public.projects
  add column if not exists client text not null default '',
  add column if not exists location text not null default '',
  add column if not exists project_type text not null default 'commercial',
  add column if not exists status text not null default 'active',
  add column if not exists green_certification text not null default 'IGBC',
  add column if not exists igbc_variant text not null default 'new',
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.projects drop constraint if exists projects_project_type_check;
alter table public.projects
  add constraint projects_project_type_check
  check (project_type in ('residential', 'commercial', 'industrial', 'infrastructure', 'mixed_use'));

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check
  check (status in ('active', 'on_hold', 'completed', 'archived'));

alter table public.projects drop constraint if exists projects_igbc_variant_check;
alter table public.projects
  add constraint projects_igbc_variant_check
  check (igbc_variant in ('new', 'existing'));

alter table public.documents
  alter column credit_id drop not null,
  add column if not exists notes text not null default '',
  add column if not exists rejection_reason text not null default '',
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents
  add constraint documents_status_check
  check (status in ('uploaded', 'approved', 'rejected'));

alter table public.project_members drop constraint if exists project_members_role_check;
alter table public.project_members
  add constraint project_members_role_check
  check (role in ('owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'admin'));

alter table public.remarks drop constraint if exists remarks_role_check;
alter table public.remarks
  add constraint remarks_role_check
  check (role in ('owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'admin'));

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  company text not null default '',
  phone text not null default '',
  global_role text not null default 'client'
    check (global_role in ('owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.recalculate_credit_completion()
returns trigger
language plpgsql
as $$
declare
  target_credit uuid;
  required_doc_count integer;
  approved_doc_count integer;
  target_credit_row public.credits%rowtype;
  new_status text;
begin
  target_credit := coalesce(new.credit_id, old.credit_id);
  if target_credit is null then
    return coalesce(new, old);
  end if;

  select * into target_credit_row from public.credits where id = target_credit;
  if target_credit_row.id is null then
    return coalesce(new, old);
  end if;

  select count(*) into required_doc_count
  from jsonb_array_elements(target_credit_row.documents_required) as item
  where coalesce((item->>'required')::boolean, false);

  select count(distinct doc_category) into approved_doc_count
  from public.documents
  where credit_id = target_credit
    and status = 'approved';

  if target_credit_row.na then
    new_status := 'complete';
  elsif required_doc_count = 0 then
    new_status := 'pending';
  elsif approved_doc_count >= required_doc_count then
    new_status := 'complete';
  elsif target_credit_row.blocked_by is not null then
    new_status := 'blocked';
  elsif approved_doc_count > 0 then
    new_status := 'in_progress';
  else
    new_status := 'pending';
  end if;

  update public.credits
  set completion_pct = case
      when required_doc_count = 0 then 100
      else round((approved_doc_count::numeric / required_doc_count::numeric) * 100, 2)
    end,
    status = new_status
  where id = target_credit;

  return coalesce(new, old);
end;
$$;

create or replace function public.notify_document_rejection()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'rejected' and old.status is distinct from new.status then
    insert into public.notifications (project_id, credit_id, document_id, user_id, body)
    select
      new.project_id,
      new.credit_id,
      new.id,
      pm.user_id,
      'A document was rejected for ' || coalesce((select credit_code from public.credits where id = new.credit_id), 'this project') || '.'
    from public.project_members pm
    where pm.project_id = new.project_id
      and pm.role in ('owner', 'client');
  end if;
  return new;
end;
$$;

alter table public.profiles enable row level security;

create policy "profiles_select_project_members"
on public.profiles for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.project_members viewer
    join public.project_members target
      on target.project_id = viewer.project_id
    where viewer.user_id = auth.uid()
      and target.user_id = profiles.user_id
  )
);

create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "profiles_insert_self"
on public.profiles for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists projects_insert_authenticated on public.projects;
create policy "projects_insert_admins"
on public.projects for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.global_role = 'admin'
  )
  or exists (
    select 1
    from public.project_members
    where project_members.user_id = auth.uid()
      and project_members.role = 'admin'
  )
);

drop policy if exists documents_insert_members on public.documents;
create policy "documents_insert_members"
on public.documents for insert
to authenticated
with check (
  public.has_project_role(project_id, array['owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'admin'])
);

drop policy if exists documents_update_consultant on public.documents;
create policy "documents_update_reviewers"
on public.documents for update
to authenticated
using (public.has_project_role(project_id, array['consultant', 'admin']))
with check (public.has_project_role(project_id, array['consultant', 'admin']));

drop policy if exists remarks_insert_members on public.remarks;
create policy "remarks_insert_members"
on public.remarks for insert
to authenticated
with check (
  exists (
    select 1 from public.credits
    where credits.id = remarks.credit_id
      and public.has_project_role(credits.project_id, array['owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'admin'])
  )
);

drop policy if exists members_insert_self on public.project_members;
create policy "members_insert_admins"
on public.project_members for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.has_project_role(project_id, array['admin'])
);

drop policy if exists storage_insert_project_documents on storage.objects;
create policy "storage_insert_project_documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-documents'
  and public.has_project_role((storage.foldername(name))[1]::uuid, array['owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'admin'])
);

drop policy if exists storage_update_project_documents on storage.objects;
create policy "storage_update_project_documents"
on storage.objects for update
to authenticated
using (
  bucket_id = 'project-documents'
  and public.has_project_role((storage.foldername(name))[1]::uuid, array['consultant', 'admin'])
)
with check (
  bucket_id = 'project-documents'
  and public.has_project_role((storage.foldername(name))[1]::uuid, array['consultant', 'admin'])
);
