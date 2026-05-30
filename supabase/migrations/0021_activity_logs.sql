create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists activity_logs_project_idx
  on public.activity_logs (project_id, created_at desc);

create index if not exists activity_logs_document_idx
  on public.activity_logs (document_id, created_at desc);

alter table public.activity_logs enable row level security;

drop policy if exists "activity_logs_select_members" on public.activity_logs;
create policy "activity_logs_select_members"
  on public.activity_logs
  for select
  using (
    project_id is null
    or public.is_project_member(project_id)
  );

drop policy if exists "activity_logs_insert_authenticated" on public.activity_logs;
create policy "activity_logs_insert_authenticated"
  on public.activity_logs
  for insert
  with check (auth.uid() is not null or auth.role() = 'service_role');
