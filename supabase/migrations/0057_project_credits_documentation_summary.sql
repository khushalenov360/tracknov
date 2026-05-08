-- Ensure older environments have documentation_summary on project_credits.
alter table if exists public.project_credits
  add column if not exists documentation_summary text;

