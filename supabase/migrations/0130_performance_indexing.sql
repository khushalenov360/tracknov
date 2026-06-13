-- Migration: 0130_performance_indexing.sql
-- Optimizing lookup speeds for frequently queried tables under project layouts

CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON public.notifications (project_id);
CREATE INDEX IF NOT EXISTS idx_system_activity_logs_project_id ON public.system_activity_logs (project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_project_id ON public.assignments (project_id);
