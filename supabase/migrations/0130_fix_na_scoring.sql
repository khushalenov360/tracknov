-- Migration: 0130_fix_na_scoring.sql
-- Adjust recompute_credit_scores to set max_points to 0 for NA (Not Applicable / Not Required) credits,
-- so they are excluded from the total available points.

CREATE OR REPLACE FUNCTION public.recompute_credit_scores(
  p_project_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.credit_scores(project_id, project_credit_id, earned_points, max_points, is_mandatory, updated_at)
  SELECT
    pc.project_id,
    pc.id as project_credit_id,
    CASE
      WHEN coalesce(pc.na, false) THEN 0
      WHEN upper(coalesce(pc.status, '')) in ('APPROVED', 'CLOSED') THEN coalesce(pc.max_points, 0)
      ELSE 0
    end as earned_points,
    CASE
      WHEN coalesce(pc.na, false) THEN 0
      ELSE coalesce(pc.max_points, 0)
    end as max_points,
    coalesce(pc.is_mandatory, false) as is_mandatory,
    timezone('utc', now())
  FROM public.project_credits pc
  WHERE pc.project_id = p_project_id
  ON CONFLICT (project_credit_id) DO UPDATE
  SET earned_points = excluded.earned_points,
      max_points = excluded.max_points,
      is_mandatory = excluded.is_mandatory,
      updated_at = excluded.updated_at;
END;
$$;

-- Trigger recomputation for all existing projects
DO $$
DECLARE
  v_proj RECORD;
BEGIN
  FOR v_proj IN SELECT id FROM public.projects LOOP
    PERFORM public.recompute_credit_scores(v_proj.id);
    PERFORM public.recompute_project_certification_state(v_proj.id);
  END LOOP;
END $$;
