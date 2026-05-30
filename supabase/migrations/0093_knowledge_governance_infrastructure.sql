-- Tracknov Knowledge Governance and Intelligence Safety Schema (v1)
-- Creates canonical registries, drift controls, quarantine buckets, and lineage tracking.

CREATE TABLE IF NOT EXISTS canonical_knowledge_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL CHECK (category IN ('MANUFACTURER', 'UNIT', 'FRAMEWORK_TERM', 'HVAC_STANDARD', 'SEMANTIC_ALIAS')),
  canonical_value TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  framework_version VARCHAR(50),
  confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  version INTEGER NOT NULL DEFAULT 1,
  approved_by TEXT NOT NULL DEFAULT 'SYSTEM',
  trace_id VARCHAR(100) NOT NULL,
  replay_hash VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_category_canonical UNIQUE (category, canonical_value, version)
);

CREATE TABLE IF NOT EXISTS knowledge_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semantic_version VARCHAR(50) NOT NULL,
  released_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  released_by TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS knowledge_mutation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  previous_value TEXT,
  new_value TEXT NOT NULL,
  mutation_type VARCHAR(50) NOT NULL CHECK (mutation_type IN ('CREATE', 'UPDATE', 'DEPRECATE', 'ROLLBACK')),
  authorized_by TEXT NOT NULL,
  replay_safe BOOLEAN NOT NULL DEFAULT true,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS ontology_conflict_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_a TEXT NOT NULL,
  term_b TEXT NOT NULL,
  relationship_type VARCHAR(50) NOT NULL,
  conflict_description TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS semantic_threshold_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_name VARCHAR(100) NOT NULL,
  previous_threshold DOUBLE PRECISION NOT NULL,
  new_threshold DOUBLE PRECISION NOT NULL,
  calibrated_by TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE canonical_knowledge_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_mutation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ontology_conflict_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_threshold_history ENABLE ROW LEVEL SECURITY;

-- Governance Policies (Advisory L5 & L6 Controls Only)
CREATE POLICY "Governance admin read access" ON canonical_knowledge_registry FOR SELECT USING (true);
CREATE POLICY "Governance admin write access" ON canonical_knowledge_registry FOR ALL USING (true);

CREATE POLICY "Versions public read access" ON knowledge_versions FOR SELECT USING (true);
CREATE POLICY "Versions admin write access" ON knowledge_versions FOR ALL USING (true);

CREATE POLICY "Mutation events read access" ON knowledge_mutation_events FOR SELECT USING (true);
CREATE POLICY "Mutation events write access" ON knowledge_mutation_events FOR ALL USING (true);

CREATE POLICY "Ontology conflict read access" ON ontology_conflict_events FOR SELECT USING (true);
CREATE POLICY "Ontology conflict write access" ON ontology_conflict_events FOR ALL USING (true);

CREATE POLICY "Threshold history read access" ON semantic_threshold_history FOR SELECT USING (true);
CREATE POLICY "Threshold history write access" ON semantic_threshold_history FOR ALL USING (true);
