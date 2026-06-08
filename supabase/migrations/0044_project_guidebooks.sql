create table if not exists public.project_guidebooks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  file_name text not null,
  file_path text not null unique,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists project_guidebooks_project_idx on public.project_guidebooks(project_id, created_at desc);

alter table public.project_guidebooks enable row level security;

drop policy if exists project_guidebooks_select on public.project_guidebooks;
create policy project_guidebooks_select
on public.project_guidebooks
for select
using (public.is_project_member(project_id));

drop policy if exists project_guidebooks_insert on public.project_guidebooks;
create policy project_guidebooks_insert
on public.project_guidebooks
for insert
with check (public.has_project_role(project_id, array['project_admin', 'super_user']));

drop policy if exists project_guidebooks_delete on public.project_guidebooks;
create policy project_guidebooks_delete
on public.project_guidebooks
for delete
using (public.has_project_role(project_id, array['project_admin', 'super_user']));

