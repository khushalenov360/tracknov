-- Aligning with TRACKNOV — DEFINITIVE RUNTIME ACCEPTANCE MATRIX + EXECUTION GOVERNANCE HANDOFF V1

-- 1. Create the new Governance State enum if it doesn't exist
-- We'll add values to the existing workflow_state enum to avoid breaking existing relations,
-- and we'll deprecate the old ones in logic.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_state') THEN
        ALTER TYPE public.workflow_state ADD VALUE IF NOT EXISTS 'ASSIGNED';
        ALTER TYPE public.workflow_state ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
        ALTER TYPE public.workflow_state ADD VALUE IF NOT EXISTS 'MAPPED';
        ALTER TYPE public.workflow_state ADD VALUE IF NOT EXISTS 'L1_REVIEW';
        ALTER TYPE public.workflow_state ADD VALUE IF NOT EXISTS 'L1_REJECTED';
        ALTER TYPE public.workflow_state ADD VALUE IF NOT EXISTS 'READY_FOR_L3';
        ALTER TYPE public.workflow_state ADD VALUE IF NOT EXISTS 'UNDER_L3_REVIEW';
        ALTER TYPE public.workflow_state ADD VALUE IF NOT EXISTS 'REVOKED';
    END IF;
END $$;

-- 2. Migrate existing data to the new governance states
-- Mapping:
-- DRAFT -> ASSIGNED
-- READY -> IN_PROGRESS
-- SUBMITTED -> L1_REVIEW
-- UNDER_REVIEW -> UNDER_L3_REVIEW
-- RESUBMITTED -> IN_PROGRESS
-- ELIMINATED -> REJECTED

UPDATE public.project_document 
SET workflow_state = CASE 
    WHEN workflow_state::text = 'DRAFT' THEN 'ASSIGNED'::public.workflow_state
    WHEN workflow_state::text = 'READY' THEN 'IN_PROGRESS'::public.workflow_state
    WHEN workflow_state::text = 'SUBMITTED' THEN 'L1_REVIEW'::public.workflow_state
    WHEN workflow_state::text = 'UNDER_REVIEW' THEN 'UNDER_L3_REVIEW'::public.workflow_state
    WHEN workflow_state::text = 'RESUBMITTED' THEN 'IN_PROGRESS'::public.workflow_state
    WHEN workflow_state::text = 'ELIMINATED' THEN 'REJECTED'::public.workflow_state
    ELSE workflow_state
END;

UPDATE public.submittals
SET state = CASE 
    WHEN state::text = 'DRAFT' THEN 'ASSIGNED'::public.workflow_state
    WHEN state::text = 'READY' THEN 'IN_PROGRESS'::public.workflow_state
    WHEN state::text = 'SUBMITTED' THEN 'L1_REVIEW'::public.workflow_state
    WHEN state::text = 'UNDER_REVIEW' THEN 'UNDER_L3_REVIEW'::public.workflow_state
    WHEN state::text = 'RESUBMITTED' THEN 'IN_PROGRESS'::public.workflow_state
    WHEN state::text = 'ELIMINATED' THEN 'REJECTED'::public.workflow_state
    ELSE state
END;

-- 3. Hardening validation rules in the DB
-- Ensure Approval without comments is blocked (handled in service layer, but could be trigger)
-- We'll add a check constraint if possible, but workflow_history already tracks reasons.

-- 4. Ensure Audit Integrity
-- Audit logs should capture actor_role from the runtime context.
CREATE OR REPLACE FUNCTION public.record_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
BEGIN
    v_actor_id := auth.uid();
    v_actor_role := current_setting('app.current_user_role', true);
    
    INSERT INTO public.audit_logs (
        entity_type,
        entity_id,
        action,
        actor_id,
        actor_role,
        summary,
        details
    ) VALUES (
        TG_TABLE_NAME,
        NEW.id::TEXT,
        TG_OP,
        v_actor_id,
        v_actor_role,
        'Deterministic Governance Action: ' || TG_OP,
        jsonb_build_object('new', to_jsonb(NEW), 'old', to_jsonb(OLD))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
