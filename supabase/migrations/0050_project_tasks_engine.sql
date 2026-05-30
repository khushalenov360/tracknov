-- P1: auto task materialization for assignments and clarification loops.

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_credit_id uuid references public.project_credits(id) on delete cascade,
  document_id uuid references public.project_document(id) on delete cascade,
  task_type text not null check (task_type in ('assignment_upload','clarification_fix','owner_review','admin_review','milestone')),
  title text not null,
  description text,
  assigned_user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  status text not null default 'open' check (status in ('open','in_progress','done','cancelled')),
  due_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_project_tasks_assignee_open
  on public.project_tasks(assigned_user_id, status, created_at desc);

create index if not exists idx_project_tasks_project_open
  on public.project_tasks(project_id, status, created_at desc);

create unique index if not exists uq_assignment_upload_open
  on public.project_tasks(project_credit_id, assigned_user_id, task_type, status)
  where task_type = 'assignment_upload' and status in ('open', 'in_progress');

create unique index if not exists uq_clarification_fix_open
  on public.project_tasks(document_id, assigned_user_id, task_type, status)
  where task_type = 'clarification_fix' and status in ('open', 'in_progress');
