-- RLS Hardening for System Tables
-- Target: recalculation_queue, system_controls, export_jobs, reconciliation_items

-- 1. recalculation_queue
ALTER TABLE public.recalculation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Users can manage recalculation_queue"
ON public.recalculation_queue
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.global_role IN ('super_user', 'super_admin')
  )
);

-- 2. system_controls
ALTER TABLE public.system_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system_controls"
ON public.system_controls
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super Users can modify system_controls"
ON public.system_controls
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.global_role IN ('super_user', 'super_admin')
  )
);

-- 3. export_jobs
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own export jobs"
ON public.export_jobs
FOR ALL
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Project Admins can view project export jobs"
ON public.export_jobs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_users
    WHERE project_users.project_id = export_jobs.project_id
    AND project_users.user_id = auth.uid()
    AND project_users.role IN ('project_admin', 'super_admin')
  )
);

-- 4. reconciliation_items
ALTER TABLE public.reconciliation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Users can manage reconciliation_items"
ON public.reconciliation_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.global_role IN ('super_user', 'super_admin')
  )
);
