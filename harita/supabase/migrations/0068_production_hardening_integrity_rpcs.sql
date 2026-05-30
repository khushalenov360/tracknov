-- Tracknov Production Hardening - V3 Integrity Scan RPCs
-- Objective: Implement backend-native integrity verification for orphan states and missing audit trails

-- 1. Find mappings missing an 'is_latest' document
CREATE OR REPLACE FUNCTION public.find_latest_version_gaps(p_project_id uuid)
RETURNS TABLE(project_credit_id uuid, mapping_count bigint) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT pd.project_credit_id, count(*)
    FROM public.project_document pd
    WHERE pd.project_id = p_project_id
    GROUP BY pd.project_credit_id
    HAVING NOT EXISTS (
        SELECT 1 FROM public.project_document pd2 
        WHERE pd2.project_credit_id = pd.project_credit_id 
        AND pd2.is_latest = true
    );
END;
$$;

-- 2. Find state transitions missing an audit log
CREATE OR REPLACE FUNCTION public.find_missing_audit_logs(p_project_id uuid)
RETURNS TABLE(entity_type text, entity_id uuid, state text, last_updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Check Documents
    SELECT 'document'::text, pd.id, pd.state::text, pd.updated_at
    FROM public.project_document pd
    WHERE pd.project_id = p_project_id
    AND NOT EXISTS (
        SELECT 1 FROM public.audit_logs al 
        WHERE al.entity_id = pd.id 
        AND al.entity_type = 'document'
        AND al.metadata->>'new_state' = pd.state::text
    )
    UNION ALL
    -- Check Credits
    SELECT 'credit'::text, pc.id, pc.state::text, pc.updated_at
    FROM public.project_credits pc
    WHERE pc.project_id = p_project_id
    AND NOT EXISTS (
        SELECT 1 FROM public.audit_logs al 
        WHERE al.entity_id = pc.id 
        AND al.entity_type = 'credit'
        AND al.metadata->>'new_state' = pc.state::text
    );
END;
$$;
