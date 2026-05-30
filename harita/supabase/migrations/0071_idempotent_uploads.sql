-- Migration to add idempotency key to document uploads

create or replace function public.insert_document_and_consume_tokens(
  p_project_id uuid,
  p_credit_id uuid,
  p_project_credit_id uuid,
  p_submittal_id uuid,
  p_uploaded_by uuid,
  p_file_name text,
  p_file_path text,
  p_file_type text,
  p_doc_category text,
  p_notes text,
  p_status text,
  p_version integer,
  p_is_latest boolean,
  p_parent_document_id uuid,
  p_client_user_id uuid,
  p_tokens integer,
  p_reason text,
  p_actor_id uuid,
  p_token_meta jsonb,
  p_file_hash text default null,
  p_idempotency_key text default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_document_id uuid;
  v_state text;
begin
  if p_idempotency_key is not null then
    -- Check for idempotency
    if exists (
      select 1 from public.audit_logs 
      where idempotency_key = p_idempotency_key
    ) then
      -- If it exists, find the document that was created with this key (it would be in the audit log payload)
      -- For now, if we hit idempotency, we can just throw or return the existing document id if we stored it.
      -- A safer approach for idempotency in this context is just to throw a conflict error, which the client can handle.
      raise exception 'Idempotency conflict: An upload with this key has already been processed.';
    end if;
  end if;

  v_state := upper(coalesce(p_status, 'DRAFT'));
  if v_state not in ('DRAFT','READY','SUBMITTED','UNDER_REVIEW','CLARIFICATION','RESUBMITTED','APPROVED','REJECTED') then
    raise exception 'Invalid document state %', v_state;
  end if;

  insert into public.project_document (
    project_id,
    credit_id,
    project_credit_id,
    submittal_id,
    uploaded_by,
    file_name,
    file_path,
    file_type,
    doc_category,
    notes,
    state,
    workflow_state,
    version,
    is_latest,
    parent_document_id,
    file_hash
  ) values (
    p_project_id,
    p_credit_id,
    p_project_credit_id,
    p_submittal_id,
    p_uploaded_by,
    p_file_name,
    p_file_path,
    p_file_type,
    p_doc_category,
    p_notes,
    v_state,
    v_state::public.workflow_state,
    p_version,
    p_is_latest,
    p_parent_document_id,
    p_file_hash
  ) returning id into v_document_id;

  if p_parent_document_id is not null then
    update public.project_document
    set is_latest = false
    where id = p_parent_document_id;
  end if;

  perform public.consume_client_tokens(
    p_client_user_id,
    p_project_id,
    p_tokens,
    p_reason,
    p_actor_id,
    coalesce(p_token_meta, '{}'::jsonb) || jsonb_build_object('document_id', v_document_id)
  );

  if p_idempotency_key is not null then
    insert into public.audit_logs (
      action_type,
      entity_type,
      entity_id,
      actor_id,
      project_id,
      metadata,
      idempotency_key
    ) values (
      'UPLOAD_DOCUMENT',
      'project_document',
      v_document_id,
      p_actor_id,
      p_project_id,
      jsonb_build_object('file_name', p_file_name),
      p_idempotency_key
    );
  end if;

  return v_document_id;
end;
$$;
