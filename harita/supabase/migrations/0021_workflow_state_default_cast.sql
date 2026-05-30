-- Migration to ensure workflow_state default is cast to enum

ALTER TABLE public.documents
  ALTER COLUMN workflow_state SET DEFAULT 'DRAFT'::public.workflow_state;
