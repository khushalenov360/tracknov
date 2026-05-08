-- 0060_break_rls_recursion.sql
-- Fixes infinite recursion in RLS policies by using security definer helpers

begin;

-- 1. Helper to get current user's global role without triggering RLS recursion
create or replace function public.get_auth_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select global_role from public.profiles where user_id = auth.uid();
$$;

-- 2. Update project_users select policy to use the helper
-- This breaks the project_users -> profiles recursion
drop policy if exists "project_users_select_admin" on public.project_users;
create policy "project_users_select_admin"
on public.project_users
for select
to authenticated
using (
  public.get_auth_user_role() in ('super_user', 'super_admin', 'project_admin')
);

-- 3. Update profiles select policy to be more efficient and safe
-- This breaks the profiles -> project_users recursion if any existed
drop policy if exists "profiles_select_project_members" on public.profiles;
create policy "profiles_select_project_members"
on public.profiles for select
to authenticated
using (
  user_id = auth.uid()
  or public.get_auth_user_role() in ('super_user', 'super_admin')
  or exists (
    -- Use a simpler check that doesn't rely on complex joins if possible
    -- But since is_project_member is security definer, we can use it safely
    select 1
    from public.project_users pu
    where pu.user_id = auth.uid()
      and exists (
        select 1 from public.project_users target
        where target.project_id = pu.project_id
          and target.user_id = profiles.user_id
      )
  )
);

commit;
