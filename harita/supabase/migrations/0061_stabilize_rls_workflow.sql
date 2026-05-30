-- 0061_stabilize_rls_workflow.sql
-- Enables RLS on core tables and defines baseline access policies

begin;

-- 1. Enable RLS on core tables
alter table public.projects enable row level security;
alter table public.project_credits enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;
alter table public.assignments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.profiles enable row level security;

-- 2. Define SELECT policies for Authenticated Users

-- PROJECTS
drop policy if exists "projects_select_member" on public.projects;
create policy "projects_select_member"
on public.projects for select
to authenticated
using (
  public.is_project_member(id)
  or public.get_auth_user_role() in ('super_user', 'super_admin')
);

-- PROJECT_CREDITS
drop policy if exists "project_credits_select_member" on public.project_credits;
create policy "project_credits_select_member"
on public.project_credits for select
to authenticated
using (
  public.is_project_member(project_id)
  or public.get_auth_user_role() in ('super_user', 'super_admin')
);

-- TASKS
drop policy if exists "tasks_select_member_or_assignee" on public.tasks;
create policy "tasks_select_member_or_assignee"
on public.tasks for select
to authenticated
using (
  public.is_project_member(project_id)
  or assigned_to = auth.uid()
  or public.get_auth_user_role() in ('super_user', 'super_admin')
);

-- TASK_HISTORY
drop policy if exists "task_history_select_related" on public.task_history;
create policy "task_history_select_related"
on public.task_history for select
to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id
    and (public.is_project_member(t.project_id) or t.assigned_to = auth.uid())
  )
  or public.get_auth_user_role() in ('super_user', 'super_admin')
);

-- ASSIGNMENTS
drop policy if exists "assignments_select_member" on public.assignments;
create policy "assignments_select_member"
on public.assignments for select
to authenticated
using (
  public.is_project_member(project_id)
  or public.get_auth_user_role() in ('super_user', 'super_admin')
);

-- AUDIT_LOGS
drop policy if exists "audit_logs_select_member" on public.audit_logs;
create policy "audit_logs_select_member"
on public.audit_logs for select
to authenticated
using (
  public.is_project_member(project_id)
  or public.get_auth_user_role() in ('super_user', 'super_admin')
);

-- PROFILES (Handled already in 0059/0060, but ensuring it's enabled)
-- The policies already exist from previous migrations.

commit;
