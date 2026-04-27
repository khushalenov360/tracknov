create table if not exists public.document_activity_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  action text not null check (action in ('uploaded', 'metadata_updated', 'status_updated', 'deleted')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists document_activity_logs_project_idx
  on public.document_activity_logs(project_id, created_at desc);

create index if not exists document_activity_logs_document_idx
  on public.document_activity_logs(document_id, created_at desc);

alter table public.document_activity_logs enable row level security;

drop policy if exists document_activity_logs_select_admins on public.document_activity_logs;
create policy document_activity_logs_select_admins
on public.document_activity_logs for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.global_role = 'super_user'
  )
  or public.has_project_role(project_id, array['project_admin', 'admin'])
);

drop policy if exists document_activity_logs_insert_members on public.document_activity_logs;
create policy document_activity_logs_insert_members
on public.document_activity_logs for insert
to authenticated
with check (
  public.is_project_member(project_id)
);
