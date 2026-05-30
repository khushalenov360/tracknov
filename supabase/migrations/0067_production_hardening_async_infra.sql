-- Tracknov Production Hardening - V2 Async Infrastructure
-- Objective: Implement resilient async queues for Notifications, Recalculations, and Exports

-- 1. Notification Outbox Enhancement
-- Ensure outbox supports the required states for Priority 2 alignment
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
        CREATE TYPE notification_status AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'RETRYING', 'DEAD_LETTER');
    END IF;
END $$;

-- Update notification_outbox status to use the enum if possible, or at least ensure compatibility
ALTER TABLE public.notification_outbox ALTER COLUMN status SET DEFAULT 'PENDING';

-- 2. Derived Recalculation Queue
-- Tracks background jobs for metric rollups and scoring
CREATE TABLE IF NOT EXISTS public.recalculation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'project', 'credit', 'score'
    entity_id UUID,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'RECALCULATING', 'COMPLETED', 'FAILED'
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recalc_queue_status ON public.recalculation_queue(status);

-- 3. Export Generation Queue
-- Tracks document/data export jobs
CREATE TABLE IF NOT EXISTS public.export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    export_type TEXT NOT NULL, -- 'ZIP', 'PDF', 'EXCEL'
    filters JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'QUEUED', -- 'QUEUED', 'GENERATING', 'COMPLETED', 'FAILED', 'RETRYING', 'ARCHIVED'
    file_path TEXT, -- Path in storage
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_project ON public.export_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON public.export_jobs(status);

-- 4. Orphan-State Governance
-- Table to track reconciliation items
CREATE TABLE IF NOT EXISTS public.reconciliation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'document', 'credit'
    entity_id UUID NOT NULL,
    issue_type TEXT NOT NULL, -- 'orphan_state', 'checksum_mismatch', 'version_gap'
    details JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'RESOLVED', 'DISMISSED'
    assigned_to UUID REFERENCES auth.users(id), -- L5 manual intervention
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- 5. Emergency Kill Switches
-- System-wide toggles for critical features
CREATE TABLE IF NOT EXISTS public.system_controls (
    feature_name TEXT PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed kill switches
INSERT INTO public.system_controls (feature_name, is_enabled)
VALUES 
    ('uploads', true),
    ('exports', true),
    ('notifications', true)
ON CONFLICT (feature_name) DO NOTHING;
