-- Update document upload transaction to include IGBC impact rules
create or replace function public.insert_document_and_consume_tokens(
  p_project_id uuid,
  p_credit_id uuid,
  p_project_credit_id uuid,
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
  p_file_hash text default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_document_id uuid;
begin
  -- 1. Insert the document
  insert into public.documents (
    project_id,
    credit_id,
    project_credit_id,
    uploaded_by,
    file_name,
    file_path,
    file_type,
    doc_category,
    notes,
    status,
    version,
    is_latest,
    parent_document_id,
    file_hash
  ) values (
    p_project_id,
    p_credit_id,
    p_project_credit_id,
    p_uploaded_by,
    p_file_name,
    p_file_path,
    p_file_type,
    p_doc_category,
    p_notes,
    p_status,
    p_version,
    p_is_latest,
    p_parent_document_id,
    p_file_hash
  ) returning id into v_document_id;

  -- 2. If parent_document_id is provided, set it to not latest
  if p_parent_document_id is not null then
    update public.documents
    set is_latest = false
    where id = p_parent_document_id;

    -- TechLead Rule: Document revised -> Credit flagged REVIEW_REQUIRED
    -- TechLead Rule: Approved credit -> revert to UNDER_REVIEW
    update public.project_credits
    set is_review_required = true,
        status = case when status = 'APPROVED' then 'UNDER_REVIEW' else status end,
        updated_at = timezone('utc', now())
    where id = p_project_credit_id;
  end if;

  -- 3. Consume the tokens
  perform public.consume_client_tokens(
    p_client_user_id,
    p_project_id,
    p_tokens,
    p_reason,
    p_actor_id,
    p_token_meta || jsonb_build_object('document_id', v_document_id)
  );

  return v_document_id;
end;
$$;
