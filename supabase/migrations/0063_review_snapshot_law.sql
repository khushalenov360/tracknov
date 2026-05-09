-- SECTION 6: Review Snapshot Law — L3 reviews are snapshot-bound

-- 1. Add version_number to document_reviews to bind the review to a specific document version
ALTER TABLE public.document_reviews 
ADD COLUMN IF NOT EXISTS version_number INTEGER;

-- 2. Update logic to ensure reviews are bound to the version at the time of review start
-- This will be enforced in the transition logic in WorkflowOrchestratorService.

-- 3. Hardening Evidence Lineage
-- Ensure each document version is linked to its audit trail
ALTER TABLE public.document_versions
ADD COLUMN IF NOT EXISTS audit_reference_id UUID;
