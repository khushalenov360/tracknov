-- Align project_credits with runtime expectations used by Tracknov UI/services.
alter table if exists public.project_credits
  add column if not exists is_mandatory boolean not null default false,
  add column if not exists documents_required jsonb not null default '[]'::jsonb,
  add column if not exists completion_pct numeric not null default 0,
  add column if not exists blocked_by text,
  add column if not exists na boolean not null default false,
  add column if not exists max_points numeric not null default 0,
  add column if not exists what_to_submit text,
  add column if not exists responsible_role text,
  add column if not exists category text,
  add column if not exists category_name text;

alter table if exists public.project_credits
  drop constraint if exists project_credits_status_check;

alter table if exists public.project_credits
  add constraint project_credits_status_check
  check (status in (
    'NOT_STARTED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','CLOSED',
    'DRAFT','ASSIGNED','RESUBMITTED','CLARIFICATION'
  ));

