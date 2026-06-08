create or replace function public.has_project_role(project uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = project
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;
