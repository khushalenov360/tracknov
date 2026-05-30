-- Migration: 0091_document_intelligence_telemetry.sql
-- Create document intelligence and semantic extraction tables

CREATE TABLE IF NOT EXISTS public.document_intelligence_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.project_document(id) ON DELETE CASCADE,
  extracted_text TEXT NOT NULL,
  confidence_score NUMERIC(4, 3) NOT NULL,
  extraction_method VARCHAR NOT NULL, -- EMBEDDED_TEXT, OCR, HYBRID
  page_count INTEGER NOT NULL DEFAULT 1,
  language VARCHAR NOT NULL DEFAULT 'en',
  positional_map JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.semantic_extraction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.project_document(id) ON DELETE CASCADE,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  indexing_duration_ms INTEGER NOT NULL DEFAULT 0,
  replay_hash VARCHAR,
  trace_id UUID NOT NULL DEFAULT gen_random_uuid(),
  causality_chain_id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.table_extraction_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.project_document(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  failure_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ocr_quality_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.project_document(id) ON DELETE CASCADE,
  image_clarity NUMERIC(4, 3) NOT NULL,
  table_readability NUMERIC(4, 3) NOT NULL,
  text_completeness NUMERIC(4, 3) NOT NULL,
  scan_skew NUMERIC(4, 3) NOT NULL,
  compression_damage NUMERIC(4, 3) NOT NULL,
  quality_score NUMERIC(4, 3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_intelligence_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_extraction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_extraction_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_quality_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all authenticated users access to document_intelligence_metrics" 
  ON public.document_intelligence_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all authenticated users access to semantic_extraction_events" 
  ON public.semantic_extraction_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all authenticated users access to table_extraction_failures" 
  ON public.table_extraction_failures FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all authenticated users access to ocr_quality_reports" 
  ON public.ocr_quality_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_doc_intel_metrics_doc ON public.document_intelligence_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_semantic_extraction_proj ON public.semantic_extraction_events(project_id);
CREATE INDEX IF NOT EXISTS idx_semantic_extraction_doc ON public.semantic_extraction_events(document_id);
CREATE INDEX IF NOT EXISTS idx_table_failures_doc ON public.table_extraction_failures(document_id);
CREATE INDEX IF NOT EXISTS idx_ocr_quality_doc ON public.ocr_quality_reports(document_id);
