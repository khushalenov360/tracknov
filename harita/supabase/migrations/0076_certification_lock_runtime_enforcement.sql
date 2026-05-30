-- Definitive Post-Certification Lock Runtime Guard & Hardening
-- Enforces absolute immutability on CERTIFIED_LOCKED projects across documents, credits, submittals, and exports.

CREATE OR REPLACE FUNCTION public.guard_certified_project_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_project_id uuid;
  v_role text := nullif(current_setting('app.current_user_role', true), '');
  v_override boolean := coalesce(current_setting('app.override', true), 'false') = 'true';
BEGIN
  IF tg_table_name = 'projects' THEN
    v_project_id := coalesce(new.id, old.id);
  ELSE
    v_project_id := coalesce(new.project_id, old.project_id);
  END IF;

  IF v_project_id IS NULL THEN
    RETURN coalesce(new, old);
  END IF;

  -- Allow state transitions out of CERTIFIED_LOCKED only via L5 override
  IF public.is_project_certified_locked(v_project_id) AND NOT (v_override AND v_role = 'super_user') THEN
    INSERT INTO public.security_events(project_id, actor_id, event_type, severity, details)
    VALUES(
      v_project_id,
      auth.uid(),
      'certified_lock_violation',
      'critical',
      jsonb_build_object('table', tg_table_name, 'operation', tg_op, 'role', v_role)
    );
    RAISE EXCEPTION 'Project is CERTIFIED_LOCKED. Mutations require L5 override.';
  END IF;

  RETURN coalesce(new, old);
END;
$function$;

-- Apply universal locking triggers across core operational entities with alphabetical prefix
-- to guarantee pre-emptive interception before standard domain triggers evaluate.
DROP TRIGGER IF EXISTS trg_project_document_certified_lock ON public.project_document;
DROP TRIGGER IF EXISTS a_guard_certified_lock_doc ON public.project_document;
CREATE TRIGGER a_guard_certified_lock_doc
BEFORE INSERT OR UPDATE OR DELETE ON public.project_document
FOR EACH ROW EXECUTE FUNCTION public.guard_certified_project_mutation();

DROP TRIGGER IF EXISTS trg_project_credits_certified_lock ON public.project_credits;
DROP TRIGGER IF EXISTS a_guard_certified_lock_credit ON public.project_credits;
CREATE TRIGGER a_guard_certified_lock_credit
BEFORE INSERT OR UPDATE OR DELETE ON public.project_credits
FOR EACH ROW EXECUTE FUNCTION public.guard_certified_project_mutation();

DROP TRIGGER IF EXISTS trg_submittals_certified_lock ON public.submittals;
DROP TRIGGER IF EXISTS a_guard_certified_lock_submittal ON public.submittals;
CREATE TRIGGER a_guard_certified_lock_submittal
BEFORE INSERT OR UPDATE OR DELETE ON public.submittals
FOR EACH ROW EXECUTE FUNCTION public.guard_certified_project_mutation();

DROP TRIGGER IF EXISTS trg_export_jobs_certified_lock ON public.export_jobs;
DROP TRIGGER IF EXISTS a_guard_certified_lock_export ON public.export_jobs;
CREATE TRIGGER a_guard_certified_lock_export
BEFORE INSERT ON public.export_jobs
FOR EACH ROW EXECUTE FUNCTION public.guard_certified_project_mutation();

DROP TRIGGER IF EXISTS trg_projects_certified_lock ON public.projects;
DROP TRIGGER IF EXISTS a_guard_certified_lock_project ON public.projects;
CREATE TRIGGER a_guard_certified_lock_project
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.guard_certified_project_mutation();
