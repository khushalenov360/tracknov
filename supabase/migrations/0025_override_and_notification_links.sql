-- P0/P1 hardening: override audit metadata + notification deep-link support

alter table if exists public.document_states
  add column if not exists is_override boolean not null default false,
  add column if not exists override_reason text;

alter table if exists public.notifications
  add column if not exists action_url text;

create index if not exists notifications_action_url_idx
  on public.notifications (action_url);

