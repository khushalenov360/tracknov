create table if not exists public.system_activity_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  entity_type text not null check (entity_type in ('project', 'credit', 'document', 'team', 'billing', 'auth')),
  entity_id text,
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.system_activity_logs enable row level security;

drop policy if exists system_activity_logs_select_members on public.system_activity_logs;
create policy "system_activity_logs_select_members"
on public.system_activity_logs for select
to authenticated
using (
  project_id is null
  or public.is_project_member(project_id)
);

drop policy if exists system_activity_logs_insert_members on public.system_activity_logs;
create policy "system_activity_logs_insert_members"
on public.system_activity_logs for insert
to authenticated
with check (
  project_id is null
  or public.has_project_role(project_id, array['owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'super_user', 'admin'])
);
