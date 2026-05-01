-- Add file_hash to documents for duplicate detection
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON documents(file_hash);

-- Update the RPC to include file_hash
CREATE OR REPLACE FUNCTION insert_document_and_consume_tokens(
  p_project_id UUID,
  p_credit_id UUID,
  p_project_credit_id UUID,
  p_uploaded_by UUID,
  p_file_name TEXT,
  p_file_path TEXT,
  p_file_type TEXT,
  p_doc_category TEXT,
  p_notes TEXT,
  p_status TEXT,
  p_version INTEGER,
  p_is_latest BOOLEAN,
  p_parent_document_id UUID,
  p_client_user_id UUID,
  p_tokens INTEGER,
  p_reason TEXT,
  p_actor_id UUID,
  p_token_meta JSONB,
  p_file_hash TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_document_id UUID;
  v_wallet_id UUID;
BEGIN
  -- Insert the document
  INSERT INTO documents (
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
    file_hash,
    workflow_state
  ) VALUES (
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
    p_file_hash,
    'uploaded'::workflow_state
  ) RETURNING id INTO v_document_id;

  -- Consume tokens (reuse existing logic from billing-service or inline)
  -- Assuming consume_client_tokens_atomic exists or using simple subtraction
  -- We'll use the existing balance update logic
  
  UPDATE client_token_wallets
  SET token_balance = token_balance - p_tokens,
      updated_at = now()
  WHERE client_user_id = p_client_user_id
  RETURNING id INTO v_wallet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for client user %', p_client_user_id;
  END IF;

  -- Record transaction
  INSERT INTO token_transactions (
    client_id,
    project_id,
    user_id,
    type,
    amount,
    reference_id,
    notes,
    metadata
  ) VALUES (
    (SELECT client_id FROM project_members WHERE user_id = p_client_user_id LIMIT 1),
    p_project_id,
    p_actor_id,
    'upload',
    -p_tokens,
    v_document_id,
    p_reason,
    p_token_meta
  );

  RETURN v_document_id;
END;
$$ LANGUAGE plpgsql;
