create table if not exists public.workflow_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('project', 'credit', 'document')),
  entity_id uuid not null,
  from_state text not null,
  to_state text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_role text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists workflow_logs_entity_lookup_idx
  on public.workflow_logs (entity_type, entity_id, created_at desc);

create index if not exists workflow_logs_created_at_idx
  on public.workflow_logs (created_at desc);

alter table public.workflow_logs enable row level security;

drop policy if exists "workflow logs readable by project members" on public.workflow_logs;
create policy "workflow logs readable by project members"
  on public.workflow_logs
  for select
  using (
    exists (
      select 1
      from public.project_members pm
      where pm.project_id = workflow_logs.entity_id
        and workflow_logs.entity_type = 'project'
        and pm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      join public.credits c on c.project_id = pm.project_id
      where workflow_logs.entity_type = 'credit'
        and c.id = workflow_logs.entity_id
        and pm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      join public.documents d on d.project_id = pm.project_id
      where workflow_logs.entity_type = 'document'
        and d.id = workflow_logs.entity_id
        and pm.user_id = auth.uid()
    )
  );

drop policy if exists "workflow logs writable by service role" on public.workflow_logs;
create policy "workflow logs writable by service role"
  on public.workflow_logs
  for insert
  with check (auth.role() = 'service_role');

drop policy if exists "workflow logs writable by authenticated members" on public.workflow_logs;
create policy "workflow logs writable by authenticated members"
  on public.workflow_logs
  for insert
  with check (auth.uid() is not null);
