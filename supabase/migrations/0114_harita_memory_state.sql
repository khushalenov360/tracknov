-- 0007_harita_memory_state.sql

create table if not exists public.harita_memory_state (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  session_id text not null,
  agent_state jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create unique index if not exists harita_memory_state_project_session_idx on public.harita_memory_state(project_id, session_id);

alter table public.harita_memory_state enable row level security;

-- Only admins/superusers and backend service role can access this.
create policy "Allow full access for service role"
  on public.harita_memory_state
  using (true)
  with check (true);
