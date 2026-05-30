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
  v_enum_type text;
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
    v_enum_type := 'workflow_state';
  ELSIF p_entity_type = 'credit' THEN
    SELECT status::text, project_id
    INTO v_current_state, v_project_id
    FROM public.project_credits
    WHERE id = p_entity_id;
    v_table_name := 'project_credits';
    v_state_column := 'status';
    v_enum_type := 'credit_status';
  ELSIF p_entity_type = 'submittal' THEN
    SELECT state::text, project_id
    INTO v_current_state, v_project_id
    FROM public.submittals
    WHERE id = p_entity_id;
    v_table_name := 'submittals';
    v_state_column := 'state';
    v_enum_type := 'workflow_state';
  ELSIF p_entity_type = 'project' THEN
    SELECT certification_state::text, id
    INTO v_current_state, v_project_id
    FROM public.projects
    WHERE id = p_entity_id;
    v_table_name := 'projects';
    v_state_column := 'certification_state';
    v_enum_type := 'project_certification_state';
  ELSE
    RAISE EXCEPTION 'Unsupported entity type: %', p_entity_type;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION '% % not found', p_entity_type, p_entity_id;
  END IF;

  IF v_current_state = p_target_state THEN
    RETURN jsonb_build_object('success', true, 'no_op', true, 'from', v_current_state, 'to', p_target_state);
  END IF;

  -- 3) Execute mutation safely with proper enum casting.
  EXECUTE format(
    'UPDATE public.%I SET %I = $1::public.%I, updated_at = now() WHERE id = $2',
    v_table_name,
    v_state_column,
    v_enum_type
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

  -- 6) Structured Audit Log
  INSERT INTO public.audit_logs (
    project_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    details,
    idempotency_key
  )
  VALUES (
    v_project_id,
    p_actor_id,
    'WORKFLOW_TRANSITION',
    p_entity_type,
    p_entity_id,
    jsonb_build_object(
      'from_state', v_current_state,
      'to_state', p_target_state,
      'reason', p_reason,
      'override', COALESCE((p_metadata->>'override')::boolean, false),
      'override_reason', p_metadata->>'overrideReason'
    ),
    p_idempotency_key
  );

  RETURN jsonb_build_object(
    'success', true,
    'from', v_current_state,
    'to', p_target_state,
    'entity_id', p_entity_id,
    'entity_type', p_entity_type
  );
END;
$function$;
