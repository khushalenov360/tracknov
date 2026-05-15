-- Tracknov Runtime Revocation Propagation Proof & Hardening
-- Enforces end-to-end certification integrity under state downgrades and MR2/Credit revocation.

-- 1. Propagate revocation impact downstream
CREATE OR REPLACE FUNCTION public.propagate_revocation_impact(
  p_project_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_reason text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- A. Mark existing completed certification exports as STALE
  UPDATE public.export_jobs
  SET status = 'STALE'
  WHERE project_id = p_project_id
    AND status = 'COMPLETED';

  -- B. Generate actionable reconciliation entries for administration
  INSERT INTO public.reconciliation_items (
    entity_type,
    entity_id,
    issue_type,
    details,
    status
  )
  VALUES (
    p_entity_type,
    p_entity_id,
    'state_revocation_impact',
    jsonb_build_object(
      'project_id', p_project_id,
      'message', 'Downstream exports and aggregated scores invalidated due to upstream state revocation.',
      'reason', p_reason,
      'revoked_at', now()
    ),
    'OPEN'
  );

  -- C. Trigger immediate downstream score recalculations
  PERFORM public.recompute_credit_scores(p_project_id);
  PERFORM public.recompute_project_certification_state(p_project_id);
END;
$function$;

-- 2. Enhanced Governed Transition RPC aligned with Runtime Column Types
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
  v_state_column text;
BEGIN
  -- 1) Idempotency short-circuit.
  SELECT details->'result' INTO v_result
  FROM public.audit_logs
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_result IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'result', v_result);
  END IF;

  -- 2) Resolve entity model robustly against actual schema columns.
  IF p_entity_type = 'document' THEN
    SELECT COALESCE(workflow_state::text, state::text), project_id, COALESCE(version_number, 1)
    INTO v_current_state, v_project_id, v_version
    FROM public.project_document
    WHERE id = p_entity_id;
    v_table_name := 'project_document';
    v_state_column := 'workflow_state';
  ELSIF p_entity_type = 'credit' THEN
    SELECT status::text, project_id
    INTO v_current_state, v_project_id
    FROM public.project_credits
    WHERE id = p_entity_id;
    v_table_name := 'project_credits';
    v_state_column := 'status';
  ELSIF p_entity_type = 'submittal' THEN
    SELECT state::text, project_id
    INTO v_current_state, v_project_id
    FROM public.submittals
    WHERE id = p_entity_id;
    v_table_name := 'submittals';
    v_state_column := 'state';
  ELSIF p_entity_type = 'project' THEN
    SELECT certification_state::text, id
    INTO v_current_state, v_project_id
    FROM public.projects
    WHERE id = p_entity_id;
    v_table_name := 'projects';
    v_state_column := 'certification_state';
  ELSE
    RAISE EXCEPTION 'Unsupported entity type: %', p_entity_type;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION '% % not found', p_entity_type, p_entity_id;
  END IF;

  IF v_current_state = p_target_state THEN
    RETURN jsonb_build_object('success', true, 'no_op', true, 'from', v_current_state, 'to', p_target_state);
  END IF;

  -- 3) Execute mutation safely.
  EXECUTE format(
    'UPDATE public.%I SET %I = $1, updated_at = now() WHERE id = $2',
    v_table_name,
    v_state_column
  ) USING p_target_state, p_entity_id;

  -- 4) Trigger downstream propagation if state is revoked/downgraded.
  IF p_target_state = 'REVOKED' THEN
    PERFORM public.propagate_revocation_impact(v_project_id, p_entity_type, p_entity_id, p_reason);
  END IF;

  -- 5) Immutable workflow history.
  INSERT INTO public.workflow_history (
    project_id,
    document_id,
    project_credit_id,
    from_state,
    to_state,
    actor_id,
    actor_role,
    reason,
    idempotency_key
  )
  VALUES (
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

  -- 6) Immutable audit trail.
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_role,
    summary,
    details,
    idempotency_key
  )
  VALUES (
    p_entity_type,
    p_entity_id::text,
    'state_transition',
    p_actor_id,
    p_actor_role,
    format('Transitioned %s from %s to %s', p_entity_type, v_current_state, p_target_state),
    jsonb_build_object(
      'from', v_current_state,
      'to', p_target_state,
      'reason', p_reason,
      'metadata', COALESCE(p_metadata, '{}'::jsonb)
    ),
    p_idempotency_key
  );

  -- 7) Review snapshot linkage (documents only).
  IF p_entity_type = 'document' AND p_target_state IN ('APPROVED', 'REJECTED', 'CLARIFICATION', 'REVOKED') THEN
    INSERT INTO public.document_reviews (
      document_id,
      project_id,
      reviewer_id,
      reviewer_role,
      action,
      status_after,
      remarks,
      version_number
    )
    VALUES (
      p_entity_id,
      v_project_id,
      p_actor_id,
      p_actor_role,
      CASE
        WHEN p_target_state = 'APPROVED' THEN 'admin_approve'
        WHEN p_target_state = 'REJECTED' THEN 'admin_reject'
        WHEN p_target_state = 'REVOKED' THEN 'status_override'
        ELSE 'owner_reject'
      END,
      lower(p_target_state),
      p_reason,
      v_version
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'from', v_current_state, 'to', p_target_state);
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$;
