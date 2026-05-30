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

create or replace function public.is_project_owner(project uuid)
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
      and role = 'owner'
  );
$$;

create or replace function public.has_project_invite(project uuid, invited_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_invites
    where project_id = project
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and accepted_at is null
      and role = invited_role
  );
$$;
