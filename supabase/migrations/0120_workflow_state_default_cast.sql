-- Migration to ensure workflow_state default is cast to enum

ALTER TABLE public.project_document
  ALTER COLUMN workflow_state SET DEFAULT 'DRAFT'::public.workflow_state;
