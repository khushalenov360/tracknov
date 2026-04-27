create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  certification_type text not null default 'IGBC Green Interiors v2',
  target_rating text not null check (target_rating in ('Certified', 'Silver', 'Gold', 'Platinum')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  credit_code text not null,
  category text not null,
  credit_name text not null,
  is_mandatory boolean not null default false,
  documents_required jsonb not null default '[]'::jsonb,
  documentation_summary text,
  completion_pct numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'blocked', 'complete')),
  blocked_by text check (blocked_by in ('owner', 'consultant', 'igbc')),
  na boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  credit_id uuid not null references public.credits(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  doc_category text not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'approved', 'rejected')),
  uploaded_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.remarks (
  id uuid primary key default gen_random_uuid(),
  credit_id uuid not null references public.credits(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  author_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('consultant', 'owner')),
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_email text,
  role text not null check (role in ('owner', 'consultant', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  unique(project_id, user_id)
);

create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  role text not null check (role in ('consultant', 'admin')),
  token text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  credit_id uuid references public.credits(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_project_member(project uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = project
      and user_id = auth.uid()
  );
$$;

create or replace function public.has_project_role(project uuid, allowed_roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = project
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

create or replace function public.is_project_owner(project uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = project
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create or replace function public.has_project_invite(project uuid, invited_role text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.project_invites
    where project_id = project
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and accepted_at is null
      and role = invited_role
  );
$$;

create or replace function public.set_document_actor()
returns trigger
language plpgsql
as $$
begin
  if new.uploaded_by is null then
    new.uploaded_by := auth.uid();
  end if;
  return new;
end;
$$;

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
  select * into target_credit_row from public.credits where id = target_credit;

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
      'A document was rejected for ' || coalesce((select credit_code from public.credits where id = new.credit_id), 'this credit') || '.'
    from public.project_members pm
    where pm.project_id = new.project_id
      and pm.role = 'owner';
  end if;
  return new;
end;
$$;

drop trigger if exists documents_set_actor on public.documents;
create trigger documents_set_actor
before insert on public.documents
for each row execute function public.set_document_actor();

drop trigger if exists documents_recalculate_after_insert on public.documents;
create trigger documents_recalculate_after_insert
after insert or update or delete on public.documents
for each row execute function public.recalculate_credit_completion();

drop trigger if exists documents_rejected_notification on public.documents;
create trigger documents_rejected_notification
after update on public.documents
for each row execute function public.notify_document_rejection();

alter table public.projects enable row level security;
alter table public.credits enable row level security;
alter table public.documents enable row level security;
alter table public.remarks enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.notifications enable row level security;

create policy "projects_select_members"
on public.projects for select
to authenticated
using (public.is_project_member(id));

create policy "projects_insert_authenticated"
on public.projects for insert
to authenticated
with check (created_by = auth.uid());

create policy "credits_select_members"
on public.credits for select
to authenticated
using (public.is_project_member(project_id));

create policy "credits_insert_consultant"
on public.credits for insert
to authenticated
with check (public.has_project_role(project_id, array['consultant', 'admin']));

create policy "credits_update_consultant"
on public.credits for update
to authenticated
using (public.has_project_role(project_id, array['consultant', 'admin']))
with check (public.has_project_role(project_id, array['consultant', 'admin']));

create policy "documents_select_members"
on public.documents for select
to authenticated
using (public.is_project_member(project_id));

create policy "documents_insert_members"
on public.documents for insert
to authenticated
with check (public.has_project_role(project_id, array['owner', 'consultant', 'admin']));

create policy "documents_update_consultant"
on public.documents for update
to authenticated
using (public.has_project_role(project_id, array['consultant', 'admin']))
with check (public.has_project_role(project_id, array['consultant', 'admin']));

create policy "remarks_select_members"
on public.remarks for select
to authenticated
using (
  exists (
    select 1 from public.credits
    where credits.id = remarks.credit_id
      and public.is_project_member(credits.project_id)
  )
);

create policy "remarks_insert_members"
on public.remarks for insert
to authenticated
with check (
  exists (
    select 1 from public.credits
    where credits.id = remarks.credit_id
      and public.has_project_role(credits.project_id, array['owner', 'consultant', 'admin'])
  )
);

create policy "members_select_members"
on public.project_members for select
to authenticated
using (public.is_project_member(project_id));

create policy "members_insert_self"
on public.project_members for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    (role = 'owner' and exists (select 1 from public.projects where id = project_id and created_by = auth.uid()))
    or public.has_project_invite(project_id, role)
  )
);

create policy "invites_select_owner_or_self"
on public.project_invites for select
to authenticated
using (
  public.is_project_owner(project_id)
  or (
    accepted_at is null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

create policy "invites_insert_owner"
on public.project_invites for insert
to authenticated
with check (public.is_project_owner(project_id));

create policy "invites_update_owner_or_self"
on public.project_invites for update
to authenticated
using (
  public.is_project_owner(project_id)
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  public.is_project_owner(project_id)
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "invites_delete_owner"
on public.project_invites for delete
to authenticated
using (public.is_project_owner(project_id));

create policy "notifications_select_self"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

create policy "storage_select_project_documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'project-documents'
  and public.is_project_member((storage.foldername(name))[1]::uuid)
);

create policy "storage_insert_project_documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-documents'
  and public.has_project_role((storage.foldername(name))[1]::uuid, array['owner', 'consultant', 'admin'])
);

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
