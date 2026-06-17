-- Migration: 0131_backfill_na_credits.sql
-- Backfill na: true for 'EDA C3' and 'IM C9' on all existing projects,
-- and recompute project summaries.

UPDATE public.project_credits
SET na = true
WHERE credit_code IN ('EDA C3', 'IM C9');

-- Trigger recomputation for all projects
DO $$
DECLARE
  v_proj RECORD;
BEGIN
  FOR v_proj IN SELECT id FROM public.projects LOOP
    PERFORM public.recompute_credit_scores(v_proj.id);
    PERFORM public.recompute_project_certification_state(v_proj.id);
  END LOOP;
END $$;
