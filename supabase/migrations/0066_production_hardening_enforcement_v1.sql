-- Tracknov Governance Hardening - V1 Frozen Baseline
-- Objective: Enforce Authoritative Project Model, Idempotency, and Atomic Transitions

-- 1. Idempotency Infrastructure
-- Adding idempotency_key to core transaction tables to prevent double-processing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'idempotency_key') THEN
        ALTER TABLE public.audit_logs ADD COLUMN idempotency_key TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_history' AND column_name = 'idempotency_key') THEN
        ALTER TABLE public.workflow_history ADD COLUMN idempotency_key TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_activity_logs' AND column_name = 'idempotency_key') THEN
        ALTER TABLE public.system_activity_logs ADD COLUMN idempotency_key TEXT UNIQUE;
    END IF;
END $$;

-- 2. Authoritative Project Model
-- Enforce exactly one L1 (Owner) and one L3 (Project Admin) per project
-- Uses partial unique indexes for high-performance governance enforcement
DROP INDEX IF EXISTS idx_project_users_one_owner;
CREATE UNIQUE INDEX idx_project_users_one_owner 
ON public.project_users (project_id) 
WHERE (role = 'owner');

DROP INDEX IF EXISTS idx_project_users_one_project_admin;
CREATE UNIQUE INDEX idx_project_users_one_project_admin 
ON public.project_users (project_id) 
WHERE (role = 'project_admin');

-- 3. Atomic Governance RPC
-- Handles state updates, history, audit, and review snapshots in a single transaction
CREATE OR REPLACE FUNCTION public.execute_governed_transition(
  p_entity_type text,
  p_entity_id uuid, 
  p_target_state text, 
  p_actor_id uuid, 
  p_actor_role text, 
  p_reason text, 
  p_idempotency_key text, 
  p_metadata jsonb DEFAULT '{}'::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_state text;
  v_project_id uuid;
  v_version integer := 1;
  v_result jsonb;
  v_table_name text;
BEGIN
  -- 1. Check Idempotency
  SELECT details->>'result' INTO v_result
  FROM public.audit_logs
  WHERE idempotency_key = p_idempotency_key;

  IF v_result IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'result', v_result);
  END IF;

  -- 2. Resolve Table and State
  IF p_entity_type = 'document' THEN
    SELECT workflow_state::text, project_id, version_number 
    INTO v_current_state, v_project_id, v_version
    FROM public.project_document
    WHERE id = p_entity_id;
    v_table_name := 'project_document';
  ELSIF p_entity_type = 'credit' THEN
    SELECT state::text, project_id
    INTO v_current_state, v_project_id
    FROM public.project_credits
    WHERE id = p_entity_id;
    v_table_name := 'project_credits';
  ELSE
    RAISE EXCEPTION 'Unsupported entity type: %', p_entity_type;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION '% % not found', p_entity_type, p_entity_id;
  END IF;

  -- 3. Verify State Transition Validity
  IF v_current_state = p_target_state THEN
    RETURN jsonb_build_object('success', true, 'no_op', true);
  END IF;

  -- 4. Execute Atomic Mutations
  
  -- Update Entity State
  EXECUTE format('UPDATE public.%I SET %I = $1, updated_at = now() WHERE id = $2', 
    v_table_name, 
    CASE WHEN p_entity_type = 'document' THEN 'workflow_state' ELSE 'state' END
  ) USING p_target_state, p_entity_id;

  -- Insert Workflow History
  INSERT INTO public.workflow_history (
    project_id, 
    document_id, 
    credit_id,
    from_state, 
    to_state, 
    actor_id, 
    actor_role, 
    reason, 
    idempotency_key
  ) VALUES (
    v_project_id, 
    CASE WHEN p_entity_type = 'document' THEN p_entity_id ELSE NULL END,
    CASE WHEN p_entity_type = 'credit' THEN p_entity_id ELSE NULL END,
    v_current_state, 
    p_target_state, 
    p_actor_id, 
    p_actor_role, 
    p_reason, 
    p_idempotency_key
  );

  -- Insert Audit Log
  INSERT INTO public.audit_logs (
    entity_type, entity_id, action, actor_id, actor_role, summary, details, idempotency_key
  ) VALUES (
    p_entity_type, p_entity_id::text, 'state_transition', p_actor_id, p_actor_role,
    format('Transitioned %s from %s to %s', p_entity_type, v_current_state, p_target_state),
    jsonb_build_object('from', v_current_state, 'to', p_target_state, 'reason', p_reason, 'metadata', p_metadata),
    p_idempotency_key
  );

  -- Insert Review (Snapshot Linkage) - Documents only
  IF p_entity_type = 'document' AND p_target_state IN ('APPROVED', 'REJECTED', 'CLARIFICATION') THEN
    INSERT INTO public.document_reviews (
      document_id, project_id, reviewer_id, reviewer_role, action, status_after, remarks, version_number
    ) VALUES (
      p_entity_id, v_project_id, p_actor_id, p_actor_role, 
      CASE 
        WHEN p_target_state = 'APPROVED' THEN 'admin_approve'
        WHEN p_target_state = 'REJECTED' THEN 'admin_reject'
        ELSE 'owner_reject' 
      END,
      lower(p_target_state), p_reason, v_version
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'from', v_current_state, 'to', p_target_state);

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$;
