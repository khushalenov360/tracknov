-- 0126_workflow_logs_enrichment.sql
alter table public.workflow_logs 
  add column if not exists is_override boolean not null default false,
  add column if not exists override_reason text;
