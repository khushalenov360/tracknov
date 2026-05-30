-- Create Task Priority Enum
DO $$ BEGIN
    CREATE TYPE public.task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Task State Enum
DO $$ BEGIN
    CREATE TYPE public.task_state AS ENUM (
        'ASSIGNED',
        'DELEGATED',
        'IN_PROGRESS',
        'UPLOADED',
        'UNDER_REVIEW',
        'CLARIFICATION',
        'APPROVED',
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    project_credit_id uuid REFERENCES public.credits(id) ON DELETE CASCADE,
    submittal_id uuid, -- Reserved for future use

    task_type text NOT NULL, -- e.g., 'credit_documentation', 'submittal_upload'

    assigned_by uuid NOT NULL REFERENCES auth.users(id),
    assigned_to uuid NOT NULL REFERENCES auth.users(id),

    delegated_by uuid REFERENCES auth.users(id),
    delegated_from uuid REFERENCES auth.users(id),

    accountable_user_id uuid NOT NULL REFERENCES auth.users(id),

    workflow_state public.task_state NOT NULL DEFAULT 'ASSIGNED',

    priority public.task_priority NOT NULL DEFAULT 'MEDIUM',

    due_date timestamptz,

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    active_flag boolean DEFAULT true
);

-- Create Task History Table
CREATE TABLE IF NOT EXISTS public.task_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,

    action_type text NOT NULL, -- 'created', 'delegated', 'state_changed', 'reassigned'

    performed_by uuid NOT NULL REFERENCES auth.users(id),

    old_state public.task_state,
    new_state public.task_state,

    old_assignee uuid REFERENCES auth.users(id),
    new_assignee uuid REFERENCES auth.users(id),

    notes text,

    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Tasks
DROP POLICY IF EXISTS "tasks_select_members" ON public.tasks;
CREATE POLICY "tasks_select_members" ON public.tasks
FOR SELECT TO authenticated
USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS "tasks_insert_authority" ON public.tasks;
CREATE POLICY "tasks_insert_authority" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
    public.has_project_role(project_id, ARRAY['project_admin', 'super_admin', 'owner', 'client'])
);

DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy" ON public.tasks
FOR UPDATE TO authenticated
USING (
    public.has_project_role(project_id, ARRAY['project_admin', 'super_admin', 'owner', 'client'])
    OR assigned_to = auth.uid()
)
WITH CHECK (
    public.has_project_role(project_id, ARRAY['project_admin', 'super_admin', 'owner', 'client'])
    OR assigned_to = auth.uid()
);

-- RLS Policies for Task History
DROP POLICY IF EXISTS "task_history_select_members" ON public.task_history;
CREATE POLICY "task_history_select_members" ON public.task_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_history.task_id
      AND public.is_project_member(tasks.project_id)
  )
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_accountable_user_id ON public.tasks(accountable_user_id);
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON public.task_history(task_id);
