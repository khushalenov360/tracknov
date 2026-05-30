-- =========================================
-- 0. HELPER FUNCTION (REUSABLE)
-- =========================================

CREATE OR REPLACE FUNCTION has_project_access(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.user_id = auth.uid()
      AND pu.project_id = p_project_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =========================================
-- 1. PROJECTS
-- =========================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_access ON projects;

CREATE POLICY projects_access
ON projects
FOR ALL
USING (has_project_access(id))
WITH CHECK (has_project_access(id));

-- =========================================
-- 2. PROJECT USERS
-- =========================================

ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_users_access ON project_users;

CREATE POLICY project_users_access
ON project_users
FOR ALL
USING (
  user_id = auth.uid()
  OR has_project_access(project_id)
)
WITH CHECK (has_project_access(project_id));

-- =========================================
-- 3. PROJECT CREDITS
-- =========================================

ALTER TABLE project_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_credits_access ON project_credits;

CREATE POLICY project_credits_access
ON project_credits
FOR ALL
USING (has_project_access(project_id))
WITH CHECK (has_project_access(project_id));

-- =========================================
-- 4. CREDIT STAGES
-- =========================================

ALTER TABLE credit_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_stages_access ON credit_stages;

CREATE POLICY credit_stages_access
ON credit_stages
FOR ALL
USING (
  project_credit_id IN (
    SELECT id FROM project_credits
    WHERE has_project_access(project_id)
  )
)
WITH CHECK (
  project_credit_id IN (
    SELECT id FROM project_credits
    WHERE has_project_access(project_id)
  )
);

-- =========================================
-- 5. SUBMITTALS (CRITICAL)
-- =========================================

ALTER TABLE submittals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS submittals_access ON submittals;

CREATE POLICY submittals_access
ON submittals
FOR ALL
USING (
  credit_stage_id IN (
    SELECT cs.id
    FROM credit_stages cs
    JOIN project_credits pc ON cs.project_credit_id = pc.id
    WHERE has_project_access(pc.project_id)
  )
)
WITH CHECK (
  credit_stage_id IN (
    SELECT cs.id
    FROM credit_stages cs
    JOIN project_credits pc ON cs.project_credit_id = pc.id
    WHERE has_project_access(pc.project_id)
  )
);

-- =========================================
-- 6. DOCUMENTS
-- =========================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_access ON documents;

CREATE POLICY documents_access
ON documents
FOR ALL
USING (has_project_access(project_id))
WITH CHECK (has_project_access(project_id));

-- =========================================
-- 7. DOCUMENT VERSIONS
-- =========================================

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_versions_access ON document_versions;

CREATE POLICY document_versions_access
ON document_versions
FOR ALL
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE has_project_access(project_id)
  )
)
WITH CHECK (
  document_id IN (
    SELECT id FROM documents
    WHERE has_project_access(project_id)
  )
);

-- =========================================
-- 8. DOCUMENT MAPPINGS
-- =========================================

ALTER TABLE document_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_mappings_access ON document_mappings;

CREATE POLICY document_mappings_access
ON document_mappings
FOR ALL
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE has_project_access(project_id)
  )
)
WITH CHECK (
  document_id IN (
    SELECT id FROM documents
    WHERE has_project_access(project_id)
  )
);

-- =========================================
-- 9. AUDIT LOGS
-- =========================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_access ON audit_logs;

CREATE POLICY audit_logs_access
ON audit_logs
FOR SELECT
USING (
  entity_id IN (
    SELECT s.id
    FROM submittals s
    JOIN credit_stages cs ON s.credit_stage_id = cs.id
    JOIN project_credits pc ON cs.project_credit_id = pc.id
    WHERE has_project_access(pc.project_id)
  )
);

-- =========================================
-- 10. TOKEN LEDGER
-- =========================================

ALTER TABLE token_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS token_ledger_access ON token_ledger;

CREATE POLICY token_ledger_access
ON token_ledger
FOR ALL
USING (has_project_access(project_id))
WITH CHECK (has_project_access(project_id));

-- =========================================
-- 11. GLOBAL TABLES (OPEN READ)
-- =========================================

ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credits_read ON credits;

CREATE POLICY credits_read
ON credits
FOR SELECT
USING (true);

ALTER TABLE workflow_transitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workflow_transitions_read ON workflow_transitions;

CREATE POLICY workflow_transitions_read
ON workflow_transitions
FOR SELECT
USING (true);

-- =========================================
-- END
-- =========================================