-- 0059_fix_team_visibility_rls.sql
-- Fixes blank Team section by aligning RLS helpers with project_users table

begin;

-- 1. Update Core Membership Helpers to use project_users instead of project_members
-- Note: keeping original parameter names to avoid dependency drop requirements
create or replace function public.is_project_member(project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_users
    where project_id = project
      and user_id = auth.uid()
  );
$$;

create or replace function public.has_project_role(project uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_users
    where project_id = project
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

create or replace function public.is_project_owner(project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_users
    where project_id = project
      and user_id = auth.uid()
      and role in ('owner', 'L2', 'L3') -- Supporting both legacy and L-scale roles
  );
$$;

-- 2. Update Profiles RLS Policy
drop policy if exists "profiles_select_project_members" on public.profiles;
create policy "profiles_select_project_members"
on public.profiles for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.project_users viewer
    join public.project_users target
      on target.project_id = viewer.project_id
    where viewer.user_id = auth.uid()
      and target.user_id = profiles.user_id
  )
);

commit;
