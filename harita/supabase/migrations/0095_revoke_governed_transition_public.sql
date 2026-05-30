-- Fix 1: RBAC PostgREST Exploit (CRITICAL P0)
-- Revoke PUBLIC execution from execute_governed_transition

REVOKE EXECUTE ON FUNCTION public.execute_governed_transition(text, uuid, text, uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_governed_transition(text, uuid, text, uuid, text, text, text, jsonb) TO service_role;
