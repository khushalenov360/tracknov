-- =========================================
-- 0. HELPER: GET USER ROLE (PROJECT-SCOPED)
-- =========================================

CREATE OR REPLACE FUNCTION get_user_role(p_project_id uuid)
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM project_users
  WHERE user_id = auth.uid()
    AND project_id = p_project_id
  LIMIT 1;

  RETURN user_role;
END;
$$ LANGUAGE plpgsql STABLE;


-- =========================================
-- 1. ROLE PERMISSION FUNCTION
-- =========================================

CREATE OR REPLACE FUNCTION can_perform_action(
  p_project_id uuid,
  p_action text
)
RETURNS boolean AS $$
DECLARE
  role text;
BEGIN
  SELECT get_user_role(p_project_id) INTO role;

  -- L5 = full access
  IF role = 'L5' THEN
    RETURN true;
  END IF;

  -- L3 = validator
  IF role = 'L3' THEN
    RETURN p_action IN ('APPROVE','REJECT','CLARIFICATION','SUBMIT');
  END IF;

  -- L1 = internal review
  IF role = 'L1' THEN
    RETURN p_action IN ('REVIEW','SUBMIT');
  END IF;

  -- L0 = upload only
  IF role = 'L0' THEN
    RETURN p_action IN ('UPLOAD');
  END IF;

  -- L2 = read only
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;


-- =========================================
-- 2. ENFORCE ON SUBMITTALS (STATE CHANGES)
-- =========================================

CREATE OR REPLACE FUNCTION enforce_role_on_workflow()
RETURNS trigger AS $$
DECLARE
  project_id uuid;
BEGIN
  -- derive project_id
  SELECT pc.project_id INTO project_id
  FROM credit_stages cs
  JOIN project_credits pc ON cs.project_credit_id = pc.id
  WHERE cs.id = NEW.credit_stage_id;

  -- APPROVAL
  IF NEW.state = 'APPROVED' THEN
    IF NOT can_perform_action(project_id, 'APPROVE') THEN
      RAISE EXCEPTION 'You are not allowed to approve';
    END IF;
  END IF;

  -- REJECTION
  IF NEW.state = 'REJECTED' THEN
    IF NOT can_perform_action(project_id, 'REJECT') THEN
      RAISE EXCEPTION 'You are not allowed to reject';
    END IF;
  END IF;

  -- SUBMISSION
  IF NEW.state = 'SUBMITTED' THEN
    IF NOT can_perform_action(project_id, 'SUBMIT') THEN
      RAISE EXCEPTION 'You are not allowed to submit';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trg_role_enforce_workflow ON submittals;

CREATE TRIGGER trg_role_enforce_workflow
BEFORE UPDATE OF state ON submittals
FOR EACH ROW
WHEN (OLD.state IS DISTINCT FROM NEW.state)
EXECUTE FUNCTION enforce_role_on_workflow();


-- =========================================
-- 3. ENFORCE ON DOCUMENT UPLOAD
-- =========================================

CREATE OR REPLACE FUNCTION enforce_upload_permission()
RETURNS trigger AS $$
BEGIN
  IF NOT can_perform_action(NEW.project_id, 'UPLOAD') THEN
    RAISE EXCEPTION 'You are not allowed to upload documents';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trg_upload_permission ON documents;

CREATE TRIGGER trg_upload_permission
BEFORE INSERT ON documents
FOR EACH ROW
EXECUTE FUNCTION enforce_upload_permission();


-- =========================================
-- 4. ENFORCE ON DOCUMENT VERSIONING
-- =========================================

CREATE OR REPLACE FUNCTION enforce_version_permission()
RETURNS trigger AS $$
DECLARE
  project_id uuid;
BEGIN
  SELECT project_id INTO project_id
  FROM documents
  WHERE id = NEW.document_id;

  IF NOT can_perform_action(project_id, 'UPLOAD') THEN
    RAISE EXCEPTION 'You are not allowed to version documents';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trg_version_permission ON document_versions;

CREATE TRIGGER trg_version_permission
BEFORE INSERT ON document_versions
FOR EACH ROW
EXECUTE FUNCTION enforce_version_permission();


-- =========================================
-- 5. OPTIONAL: PREVENT DELETE (HARD LOCK)
-- =========================================

CREATE OR REPLACE FUNCTION prevent_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Deletion is not allowed in this system';
END;
$$ LANGUAGE plpgsql;

-- Apply where needed:
-- CREATE TRIGGER trg_no_delete_documents BEFORE DELETE ON documents FOR EACH ROW EXECUTE FUNCTION prevent_delete();