-- Fix 'Function Search Path Mutable' for all functions in the public schema
-- This dynamically loops through all functions in 'public' that don't have a search_path set
-- and enforces 'search_path = public' to prevent privilege escalation vulnerabilities.
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
          AND p.prokind = 'f' -- functions
          AND (p.proconfig IS NULL OR NOT ('search_path' = ANY (p.proconfig::text[]))) -- search_path not set
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', rec.schema_name, rec.function_name, rec.args);
    END LOOP;
END $$;
