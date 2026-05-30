-- Fix Security Definer View Warning
alter view public.project_usage_summary set (security_invoker = on);

-- Fix RLS Disabled in Public Warning for approved_document_sets
alter table public.approved_document_sets enable row level security;

drop policy if exists approved_document_sets_select on public.approved_document_sets;
create policy "approved_document_sets_select"
on public.approved_document_sets for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists approved_document_sets_all_admins on public.approved_document_sets;
create policy "approved_document_sets_all_admins"
on public.approved_document_sets for all
to authenticated
using (public.has_project_role(project_id, array['project_admin', 'super_admin', 'super_user', 'admin', 'l1_reviewer', 'l2_reviewer', 'l3_auditor']))
with check (public.has_project_role(project_id, array['project_admin', 'super_admin', 'super_user', 'admin', 'l1_reviewer', 'l2_reviewer', 'l3_auditor']));

-- Fix RLS Disabled in Public Warning for approved_document_set_items
alter table public.approved_document_set_items enable row level security;

drop policy if exists approved_document_set_items_select on public.approved_document_set_items;
create policy "approved_document_set_items_select"
on public.approved_document_set_items for select
to authenticated
using (
  exists (
    select 1 from public.approved_document_sets s
    where s.id = set_id and public.is_project_member(s.project_id)
  )
);

drop policy if exists approved_document_set_items_all_admins on public.approved_document_set_items;
create policy "approved_document_set_items_all_admins"
on public.approved_document_set_items for all
to authenticated
using (
  exists (
    select 1 from public.approved_document_sets s
    where s.id = set_id and public.has_project_role(s.project_id, array['project_admin', 'super_admin', 'super_user', 'admin', 'l1_reviewer', 'l2_reviewer', 'l3_auditor'])
  )
)
with check (
  exists (
    select 1 from public.approved_document_sets s
    where s.id = set_id and public.has_project_role(s.project_id, array['project_admin', 'super_admin', 'super_user', 'admin', 'l1_reviewer', 'l2_reviewer', 'l3_auditor'])
  )
);
