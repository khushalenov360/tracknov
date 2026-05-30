-- 0070_fix_project_membership_visibility.sql
-- Harden project_users RLS and normalize membership helpers to ensure consistent visibility.

begin;

-- 1. Normalize Membership Helpers
-- Ensure they are security definer and robust against RLS

create or replace function public.is_project_user_member(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_users
    where project_id = project_uuid
    and user_id = auth.uid()
  );
$$;

-- Alias for backward compatibility if needed
create or replace function public.is_project_member(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_project_user_member(project_uuid);
$$;

-- 2. Update project_users RLS Policies
-- We need to allow users to see:
-- a) Their own memberships (user_id = auth.uid())
-- b) Other members of projects they are in (but without recursion)

drop policy if exists project_users_select_project_members on public.project_users;
drop policy if exists "project_users_select_admin" on public.project_users;

-- Policy for users to see their own records (basic)
create policy "project_users_select_own"
on public.project_users
for select
to authenticated
using (
  user_id = auth.uid()
);

-- Policy for users to see other members in the same project
-- This uses the security-definer helper to avoid recursion
create policy "project_users_select_team"
on public.project_users
for select
to authenticated
using (
  public.is_project_user_member(project_id)
);

-- Policy for admins to see all memberships
create policy "project_users_select_admin"
on public.project_users
for select
to authenticated
using (
  public.get_auth_user_role() in ('super_user', 'super_admin', 'project_admin')
);

-- 3. Update Projects Policy
-- Ensure it uses the normalized helper consistently

drop policy if exists "projects_select_v1" on public.projects;
drop policy if exists "projects_select_member" on public.projects;

create policy "projects_select_member_v1"
on public.projects
for select
to authenticated
using (
  public.is_project_user_member(id)
  or public.get_auth_user_role() in ('super_user', 'super_admin', 'project_admin')
);

commit;
