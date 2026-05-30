-- Extend governed transition RPC to support submittal and project entities.

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

  -- 2) Resolve entity model.
  IF p_entity_type = 'document' THEN
    SELECT COALESCE(workflow_state::text, state::text), project_id, COALESCE(version_number, 1)
    INTO v_current_state, v_project_id, v_version
    FROM public.project_document
    WHERE id = p_entity_id;
    v_table_name := 'project_document';
    v_state_column := 'workflow_state';
  ELSIF p_entity_type = 'credit' THEN
    SELECT state::text, project_id
    INTO v_current_state, v_project_id
    FROM public.project_credits
    WHERE id = p_entity_id;
    v_table_name := 'project_credits';
    v_state_column := 'state';
  ELSIF p_entity_type = 'submittal' THEN
    SELECT state::text, project_id
    INTO v_current_state, v_project_id
    FROM public.submittals
    WHERE id = p_entity_id;
    v_table_name := 'submittals';
    v_state_column := 'state';
  ELSIF p_entity_type = 'project' THEN
    SELECT state::text, id
    INTO v_current_state, v_project_id
    FROM public.projects
    WHERE id = p_entity_id;
    v_table_name := 'projects';
    v_state_column := 'state';
  ELSE
    RAISE EXCEPTION 'Unsupported entity type: %', p_entity_type;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION '% % not found', p_entity_type, p_entity_id;
  END IF;

  IF v_current_state = p_target_state THEN
    RETURN jsonb_build_object('success', true, 'no_op', true, 'from', v_current_state, 'to', p_target_state);
  END IF;

  -- 3) Execute mutation.
  EXECUTE format(
    'UPDATE public.%I SET %I = $1, updated_at = now() WHERE id = $2',
    v_table_name,
    v_state_column
  ) USING p_target_state, p_entity_id;

  -- 4) Immutable workflow history.
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

  -- 5) Immutable audit trail.
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

  -- 6) Review snapshot linkage (documents only).
  IF p_entity_type = 'document' AND p_target_state IN ('APPROVED', 'REJECTED', 'CLARIFICATION') THEN
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

