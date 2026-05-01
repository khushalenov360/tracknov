-- 0033_performance_indexes.sql
-- Optimizing lookup speeds for high-volume dashboard and review queues

-- Index for document lookups by project and state (Review Queue + Dashboard)
CREATE INDEX IF NOT EXISTS idx_documents_project_state ON documents (project_id, workflow_state);

-- Index for document lookups by credit (Workspace detail)
CREATE INDEX IF NOT EXISTS idx_documents_credit_id ON documents (credit_id);

-- Index for audit logs by document (Timeline)
CREATE INDEX IF NOT EXISTS idx_activity_logs_document_id ON document_activity_logs (document_id);

-- Index for token transactions by project (Monetization Analytics)
CREATE INDEX IF NOT EXISTS idx_token_transactions_project_id ON token_transactions (project_id);

-- Index for project members by user (Dashboard visibility)
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members (user_id);

-- Index for credits by project (Dashboard completeness)
CREATE INDEX IF NOT EXISTS idx_credits_project_id ON credits (project_id);
