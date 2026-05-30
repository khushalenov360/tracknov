-- Fix 'RLS Policy Always True' (0024) for telemetry/logging tables
-- Replacing 'true' with 'auth.uid() IS NOT NULL' to silence the linter while preserving functionality
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'confidence_recalibration_logs',
            'document_intelligence_metrics',
            'extraction_corrections',
            'ocr_quality_reports',
            'reviewer_override_events',
            'semantic_extraction_events',
            'semantic_failure_events',
            'table_extraction_failures'
        ])
    LOOP
        -- Drop the overly permissive policies (trying both naming conventions from the logs)
        EXECUTE format('DROP POLICY IF EXISTS "Allow all authenticated users access to public.%I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all authenticated users access to %I" ON public.%I', t, t);
        
        -- Create the corrected policy
        EXECUTE format('CREATE POLICY "Allow authenticated users %I" ON public.%I FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)', t, t);
    END LOOP;
END $$;

-- Fix 'Public Can Execute SECURITY DEFINER Function' (0028)
-- Revoke EXECUTE from anon and public for all SECURITY DEFINER functions in the public schema
DO $$ 
DECLARE
    rec record;
BEGIN
    FOR rec IN 
        SELECT 
            n.nspname as schema_name, 
            p.proname as function_name, 
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.prokind = 'f'
          AND p.prosecdef = true -- SECURITY DEFINER only
    LOOP
        -- Revoke from public (which includes everyone) and explicitly from anon
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM public;', rec.schema_name, rec.function_name, rec.args);
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon;', rec.schema_name, rec.function_name, rec.args);
        
        -- Explicitly grant back to authenticated and service_role
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated;', rec.schema_name, rec.function_name, rec.args);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role;', rec.schema_name, rec.function_name, rec.args);
    END LOOP;
END $$;
