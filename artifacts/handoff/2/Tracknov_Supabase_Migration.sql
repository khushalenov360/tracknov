-- Tracknov Supabase Migration (Execution Version)

-- 1. ENUM for workflow state
CREATE TYPE workflow_state AS ENUM (
  'DRAFT',
  'READY',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED'
);

-- 2. credit_stages table
CREATE TABLE credit_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_credit_id UUID NOT NULL,
  stage TEXT CHECK (stage IN ('DESIGN','CONSTRUCTION')),
  state workflow_state DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. submittals table
CREATE TABLE submittals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_stage_id UUID NOT NULL,
  name TEXT,
  type TEXT,
  required_flag BOOLEAN DEFAULT TRUE,
  state workflow_state DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. alter documents table
ALTER TABLE documents
ADD COLUMN submittal_id UUID;

-- 5. indexes
CREATE INDEX idx_project_credit ON project_credits(project_id);
CREATE INDEX idx_credit_stage ON credit_stages(project_credit_id);
CREATE INDEX idx_submittal ON submittals(credit_stage_id);
CREATE INDEX idx_document_submittal ON documents(submittal_id);

-- 6. workflow logs
CREATE TABLE workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT,
  entity_id UUID,
  from_state workflow_state,
  to_state workflow_state,
  user_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. override logs
CREATE TABLE override_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID,
  reason TEXT,
  admin_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
