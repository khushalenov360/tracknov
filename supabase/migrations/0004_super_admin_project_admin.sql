alter table public.project_members drop constraint if exists project_members_role_check;
alter table public.project_members
  add constraint project_members_role_check
  check (role in ('owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin'));

alter table public.remarks drop constraint if exists remarks_role_check;
alter table public.remarks
  add constraint remarks_role_check
  check (role in ('owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin'));

alter table public.profiles drop constraint if exists profiles_global_role_check;
alter table public.profiles
  add constraint profiles_global_role_check
  check (global_role in ('owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin'));

drop policy if exists projects_insert_admins on public.projects;
create policy "projects_insert_super_admins"
on public.projects for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.global_role in ('super_admin', 'admin')
  )
  or exists (
    select 1
    from public.project_members
    where project_members.user_id = auth.uid()
      and project_members.role in ('super_admin', 'admin')
  )
);

drop policy if exists credits_insert_consultant on public.credits;
create policy "credits_insert_reviewers"
on public.credits for insert
to authenticated
with check (public.has_project_role(project_id, array['consultant', 'project_admin', 'super_admin', 'admin']));

drop policy if exists credits_update_consultant on public.credits;
create policy "credits_update_reviewers"
on public.credits for update
to authenticated
using (public.has_project_role(project_id, array['consultant', 'project_admin', 'super_admin', 'admin']))
with check (public.has_project_role(project_id, array['consultant', 'project_admin', 'super_admin', 'admin']));

drop policy if exists documents_insert_members on public.documents;
create policy "documents_insert_members"
on public.documents for insert
to authenticated
with check (
  public.has_project_role(project_id, array['owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'admin'])
);

drop policy if exists documents_update_reviewers on public.documents;
drop policy if exists documents_update_consultant on public.documents;
create policy "documents_update_reviewers"
on public.documents for update
to authenticated
using (public.has_project_role(project_id, array['consultant', 'project_admin', 'super_admin', 'admin']))
with check (public.has_project_role(project_id, array['consultant', 'project_admin', 'super_admin', 'admin']));

drop policy if exists remarks_insert_members on public.remarks;
create policy "remarks_insert_members"
on public.remarks for insert
to authenticated
with check (
  exists (
    select 1 from public.credits
    where credits.id = remarks.credit_id
      and public.has_project_role(credits.project_id, array['owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'admin'])
  )
);

drop policy if exists members_insert_admins on public.project_members;
create policy "members_insert_admins"
on public.project_members for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.has_project_role(project_id, array['project_admin', 'super_admin', 'admin'])
);

drop policy if exists storage_insert_project_documents on storage.objects;
create policy "storage_insert_project_documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-documents'
  and public.has_project_role((storage.foldername(name))[1]::uuid, array['owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'admin'])
);

drop policy if exists storage_update_project_documents on storage.objects;
create policy "storage_update_project_documents"
on storage.objects for update
to authenticated
using (
  bucket_id = 'project-documents'
  and public.has_project_role((storage.foldername(name))[1]::uuid, array['consultant', 'project_admin', 'super_admin', 'admin'])
)
with check (
  bucket_id = 'project-documents'
  and public.has_project_role((storage.foldername(name))[1]::uuid, array['consultant', 'project_admin', 'super_admin', 'admin'])
);
