create or replace function public.is_project_member(project uuid)
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
  );
$$;
