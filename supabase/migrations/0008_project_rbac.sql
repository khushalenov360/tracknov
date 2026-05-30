drop policy if exists projects_select_super_users on public.projects;
create policy "projects_select_super_users"
on public.projects for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.global_role = 'super_user'
  )
);

drop policy if exists projects_update_admins on public.projects;
create policy "projects_update_admins"
on public.projects for update
to authenticated
using (
  public.has_project_role(id, array['project_admin', 'super_admin', 'super_user', 'admin'])
)
with check (
  public.has_project_role(id, array['project_admin', 'super_admin', 'super_user', 'admin'])
);

drop policy if exists projects_delete_super_users on public.projects;
create policy "projects_delete_super_users"
on public.projects for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.global_role = 'super_user'
  )
);
