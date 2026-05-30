-- Migration: 0092_human_feedback_learning_loop.sql
-- Create database schema tables for real-world extraction accuracy learning loop

CREATE TABLE IF NOT EXISTS public.extraction_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.project_document(id) ON DELETE CASCADE,
  extraction_type VARCHAR NOT NULL, -- OCR, TABLE, SEMANTIC_TAG, DUPLICATE_DETECTION, CLARIFICATION
  original_value TEXT NOT NULL,
  corrected_value TEXT NOT NULL,
  correction_reason TEXT,
  reviewer_id UUID,
  trace_id UUID NOT NULL DEFAULT gen_random_uuid(),
  replay_hash VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.semantic_failure_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.project_document(id) ON DELETE CASCADE,
  failure_type VARCHAR NOT NULL, -- OCR_NOISE, TABLE_FRAGMENTATION, WRONG_SEMANTIC_TAG, DUPLICATE_FALSE_POSITIVE, CLARIFICATION_HALLUCINATION, UNIT_MISREAD, MULTI_PAGE_MERGE_FAILURE, MANUFACTURER_CONFUSION
  failure_description TEXT NOT NULL,
  trace_id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviewer_override_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.project_document(id) ON DELETE CASCADE,
  override_type VARCHAR NOT NULL,
  override_reason TEXT,
  trace_id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.confidence_recalibration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_type VARCHAR NOT NULL,
  previous_confidence NUMERIC(4, 3) NOT NULL,
  adjusted_confidence NUMERIC(4, 3) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.extraction_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_failure_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviewer_override_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confidence_recalibration_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all authenticated users access to public.extraction_corrections" 
  ON public.extraction_corrections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all authenticated users access to public.semantic_failure_events" 
  ON public.semantic_failure_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all authenticated users access to public.reviewer_override_events" 
  ON public.reviewer_override_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all authenticated users access to public.confidence_recalibration_logs" 
  ON public.confidence_recalibration_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_extraction_corrections_proj ON public.extraction_corrections(project_id);
CREATE INDEX IF NOT EXISTS idx_extraction_corrections_doc ON public.extraction_corrections(document_id);
CREATE INDEX IF NOT EXISTS idx_semantic_failures_doc ON public.semantic_failure_events(document_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_overrides_proj ON public.reviewer_override_events(project_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_overrides_doc ON public.reviewer_override_events(document_id);
