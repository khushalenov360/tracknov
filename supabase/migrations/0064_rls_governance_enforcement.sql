-- 0064_rls_governance_enforcement.sql
-- Enforces V1 Governance Visibility Laws and secures 31 exposed tables.

begin;

-- 1. ENABLE RLS ON EXPOSED TABLES
ALTER TABLE public.override_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mandatory_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migration_integrity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_transition_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_digest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_reconciliation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_desync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 2. HELPER FOR SYSTEM ACCESS
-- Some tables are global but sensitive
CREATE OR REPLACE FUNCTION public.is_super_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND global_role IN ('super_user', 'super_admin')
  );
$$;

-- 3. PROJECTS POLICIES
drop policy if exists "projects_select_v1" on public.projects;
create policy "projects_select_v1" on public.projects
for select to authenticated
using (
  is_project_user_member(id)
  or is_super_user()
);

drop policy if exists "projects_modify_v1" on public.projects;
create policy "projects_modify_v1" on public.projects
for all to authenticated
using (
  has_project_user_role(id, ARRAY['project_admin', 'super_admin'])
  or is_super_user()
)
with check (
  has_project_user_role(id, ARRAY['project_admin', 'super_admin'])
  or is_super_user()
);

-- 4. PROJECT-SCOPED TABLES (WITH project_id)
DO $$
DECLARE
  t text;
  tables_with_project_id text[] := ARRAY[
    'project_credits', 'assignments', 'override_logs', 'security_events',
    'runtime_alerts', 'runtime_metrics', 'runtime_desync',
    'runtime_reconciliation_queue', 'notification_outbox', 'assignment_logs',
    'credit_scores', 'validation_snapshots', 'validation_results',
    'project_tasks', 'certification_snapshots', 'validation_rules'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_project_id LOOP
    EXECUTE format('drop policy if exists "select_member_v1" on public.%I', t);
    EXECUTE format('create policy "select_member_v1" on public.%I for select to authenticated using (is_project_user_member(project_id) or is_super_user())', t);
    
    EXECUTE format('drop policy if exists "modify_admin_v1" on public.%I', t);
    EXECUTE format('create policy "modify_admin_v1" on public.%I for all to authenticated using (has_project_user_role(project_id, ARRAY[''project_admin'', ''super_admin'']) or is_super_user())', t);
  END LOOP;
END $$;

-- 5. INDIRECT LOOKUP TABLES
-- document_versions
drop policy if exists "document_versions_select_v1" on public.document_versions;
create policy "document_versions_select_v1" on public.document_versions
for select to authenticated
using (
  exists (select 1 from public.project_document d where d.id = document_id and is_project_user_member(d.project_id))
  or is_super_user()
);

-- credit_stages
drop policy if exists "credit_stages_select_v1" on public.credit_stages;
create policy "credit_stages_select_v1" on public.credit_stages
for select to authenticated
using (
  exists (select 1 from public.project_credits pc where pc.id = project_credit_id and is_project_user_member(pc.project_id))
  or is_super_user()
);

-- mandatory_requirements
drop policy if exists "mandatory_requirements_select_v1" on public.mandatory_requirements;
create policy "mandatory_requirements_select_v1" on public.mandatory_requirements
for select to authenticated
using (
  exists (select 1 from public.project_credits pc where pc.id = project_credit_id and is_project_user_member(pc.project_id))
  or is_super_user()
);

-- 6. SYSTEM-ONLY TABLES (Super User / Service Role)
DO $$
DECLARE
  t text;
  system_tables text[] := ARRAY[
    'schema_migration_integrity', 'workflow_transition_rules',
    'notification_digest_runs', 'rule_sets', 'rules',
    'rule_dependencies', 'thresholds', 'audit_logs', 'workflow_history'
  ];
BEGIN
  FOREACH t IN ARRAY system_tables LOOP
    EXECUTE format('drop policy if exists "system_only_v1" on public.%I', t);
    EXECUTE format('create policy "system_only_v1" on public.%I for select to authenticated using (is_super_user())', t);
  END LOOP;
END $$;

-- 7. GLOBAL READ-ONLY (Accessible to all members for context)
drop policy if exists "global_read_v1" on public.manual_versions;
create policy "global_read_v1" on public.manual_versions for select to authenticated using (true);

drop policy if exists "global_read_v1" on public.certification_levels;
create policy "global_read_v1" on public.certification_levels for select to authenticated using (true);

-- 8. REPAIR PROJECT_DOCUMENT L0 ISOLATION (V1 Governance Sec 8)
drop policy if exists "project_document_select_members" on public.project_document;
drop policy if exists "project_document_select_v1" on public.project_document;
create policy "project_document_select_v1" on public.project_document
for select to authenticated
using (
  -- L3/L1/L5 see everything
  has_project_user_role(project_id, ARRAY['owner', 'project_admin', 'super_admin'])
  or is_super_user()
  -- L0 sees only uploaded by self or assigned mappings
  or (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.assignments a
      where a.project_id = project_document.project_id
        and a.project_credit_id = project_document.project_credit_id
        and a.user_id = auth.uid()
        and a.is_active = true
    )
  )
);

commit;
