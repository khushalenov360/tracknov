-- Migration to allow admin-tier roles (super_user, super_admin, project_admin) to bypass document assignment checks on upload.
CREATE OR REPLACE FUNCTION public.guard_assignment_before_upload()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_assigned boolean;
  v_is_admin boolean;
BEGIN
  -- 1. Check if uploader has a global admin-tier role
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.user_id = new.uploaded_by
      AND p.global_role IN ('super_user', 'super_admin', 'admin', 'L5', 'L3')
  ) INTO v_is_admin;

  -- 2. Check if uploader has a project-level admin-tier role
  IF NOT v_is_admin AND new.project_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.project_users pu
      WHERE pu.project_id = new.project_id
        AND pu.user_id = new.uploaded_by
        AND pu.role IN ('super_user', 'super_admin', 'project_admin', 'admin', 'L5', 'L3')
    ) INTO v_is_admin;
  END IF;

  -- Bypass assignment checks for admin-tier roles
  IF v_is_admin THEN
    RETURN new;
  END IF;

  -- Normal assignment check for L0/L1 users
  SELECT public.is_assigned_user(new.project_credit_id, new.uploaded_by) INTO v_is_assigned;

  IF NOT v_is_assigned THEN
    RAISE EXCEPTION 'Only the assigned owner can upload for this project credit.';
  END IF;

  RETURN new;
END;
$$;
