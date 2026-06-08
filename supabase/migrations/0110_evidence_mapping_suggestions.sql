-- Migration: Add suggestions to document_intelligence for Evidence Mapping Engine
ALTER TABLE document_intelligence
ADD COLUMN evidence_type TEXT,
ADD COLUMN suggested_credits JSONB DEFAULT '[]'::jsonb,
ADD COLUMN responsible_roles JSONB DEFAULT '[]'::jsonb;
