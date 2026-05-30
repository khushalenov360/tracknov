-- Migration: 0078_governance_missing_layers
-- Purpose: Adds the missing Layer 1 snapshot columns and Layer 5 replay certificates table

BEGIN;

-- Layer 1: Add missing columns to certification_snapshots
ALTER TABLE public.certification_snapshots
  ADD COLUMN IF NOT EXISTS framework_type text,
  ADD COLUMN IF NOT EXISTS snapshot_type text,
  ADD COLUMN IF NOT EXISTS snapshot_version integer,
  ADD COLUMN IF NOT EXISTS lineage_hash text,
  ADD COLUMN IF NOT EXISTS parent_snapshot_id uuid references public.certification_snapshots(id) on delete set null,
  ADD COLUMN IF NOT EXISTS workflow_state jsonb,
  ADD COLUMN IF NOT EXISTS certification_state jsonb,
  ADD COLUMN IF NOT EXISTS derived_state jsonb,
  ADD COLUMN IF NOT EXISTS export_references jsonb,
  ADD COLUMN IF NOT EXISTS dependency_graph jsonb,
  ADD COLUMN IF NOT EXISTS replay_contract_version text,
  ADD COLUMN IF NOT EXISTS immutable_lock boolean default true;

-- Layer 5: Create replay_certificates table
CREATE TABLE IF NOT EXISTS public.replay_certificates (
  certificate_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  snapshot_id uuid not null references public.certification_snapshots(id) on delete cascade,
  replay_hash text not null,
  replay_contract_version text not null,
  replay_timestamp timestamptz not null,
  deterministic_match boolean not null default true,
  consecutive_replay_passes integer not null default 3,
  authorization_scope_validated boolean not null default true,
  generated_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_replay_certificates_lookup
  ON public.replay_certificates(project_id, created_at desc);

ALTER TABLE public.replay_certificates ENABLE ROW LEVEL SECURITY;

-- Append-only protection triggers
DROP TRIGGER IF EXISTS trg_replay_certificates_append_only_update ON public.replay_certificates;
DROP TRIGGER IF EXISTS trg_replay_certificates_append_only_delete ON public.replay_certificates;

CREATE TRIGGER trg_replay_certificates_append_only_update
  BEFORE UPDATE ON public.replay_certificates
  FOR EACH ROW EXECUTE FUNCTION public.prevent_append_only_mutation();

CREATE TRIGGER trg_replay_certificates_append_only_delete
  BEFORE DELETE ON public.replay_certificates
  FOR EACH ROW EXECUTE FUNCTION public.prevent_append_only_mutation();

COMMIT;
