/* Migration to rename role 'owner' to 'pm' */

-- Update role values in project_roles table (adjust table name if different)
UPDATE public.project_roles SET role = 'pm' WHERE role = 'owner';

-- If there is a specific owners table, rename function references
-- Example: replace is_project_owner function
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
CREATE OR REPLACE FUNCTION public.is_project_pm(project uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_roles
    WHERE project_id = project AND role = 'pm'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Update policies that reference 'owner'
-- This is a placeholder; actual policies should be edited manually or via additional migrations.
