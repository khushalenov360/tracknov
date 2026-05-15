-- Migration: 0079_runtime_instrumentation_layer
-- Purpose: Implementation of Runtime Instrumentation Layer tables (Layer 2-4)

BEGIN;

-- 1. runtime_mutation_events
CREATE TABLE IF NOT EXISTS public.runtime_mutation_events (
  event_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid,
  mutation_type text not null,
  source_layer text not null,
  replay_mode boolean not null default false,
  blocked boolean not null default false,
  reason text,
  timestamp timestamptz not null default timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_runtime_mutation_events_lookup 
  ON public.runtime_mutation_events(project_id, timestamp desc);

-- 2. governance_observability_events
CREATE TABLE IF NOT EXISTS public.governance_observability_events (
  event_id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  actor_id uuid,
  category text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  source_layer text not null,
  replay_mode boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  timestamp timestamptz not null default timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_governance_observability_events_lookup 
  ON public.governance_observability_events(project_id, category, timestamp desc);

-- 3. runtime_proof_artifacts
CREATE TABLE IF NOT EXISTS public.runtime_proof_artifacts (
  artifact_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  proof_type text not null,
  runtime_source text not null,
  payload jsonb not null default '{}'::jsonb,
  lineage_hash text,
  generated_at timestamptz not null default timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_runtime_proof_artifacts_lookup 
  ON public.runtime_proof_artifacts(project_id, proof_type, generated_at desc);

-- Enable RLS
ALTER TABLE public.runtime_mutation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_observability_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_proof_artifacts ENABLE ROW LEVEL SECURITY;

-- Apply append-only protection
DO $$
BEGIN
  -- Mutation events triggers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_runtime_mutation_events_append_only_update') THEN
    CREATE TRIGGER trg_runtime_mutation_events_append_only_update
      BEFORE UPDATE ON public.runtime_mutation_events
      FOR EACH ROW EXECUTE FUNCTION public.prevent_append_only_mutation();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_runtime_mutation_events_append_only_delete') THEN
    CREATE TRIGGER trg_runtime_mutation_events_append_only_delete
      BEFORE DELETE ON public.runtime_mutation_events
      FOR EACH ROW EXECUTE FUNCTION public.prevent_append_only_mutation();
  END IF;

  -- Observability events triggers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_governance_observability_events_append_only_update') THEN
    CREATE TRIGGER trg_governance_observability_events_append_only_update
      BEFORE UPDATE ON public.governance_observability_events
      FOR EACH ROW EXECUTE FUNCTION public.prevent_append_only_mutation();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_governance_observability_events_append_only_delete') THEN
    CREATE TRIGGER trg_governance_observability_events_append_only_delete
      BEFORE DELETE ON public.governance_observability_events
      FOR EACH ROW EXECUTE FUNCTION public.prevent_append_only_mutation();
  END IF;

  -- Proof artifacts triggers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_runtime_proof_artifacts_append_only_update') THEN
    CREATE TRIGGER trg_runtime_proof_artifacts_append_only_update
      BEFORE UPDATE ON public.runtime_proof_artifacts
      FOR EACH ROW EXECUTE FUNCTION public.prevent_append_only_mutation();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_runtime_proof_artifacts_append_only_delete') THEN
    CREATE TRIGGER trg_runtime_proof_artifacts_append_only_delete
      BEFORE DELETE ON public.runtime_proof_artifacts
      FOR EACH ROW EXECUTE FUNCTION public.prevent_append_only_mutation();
  END IF;
END $$;

COMMIT;
