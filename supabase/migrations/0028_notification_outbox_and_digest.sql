-- P1: Notification channels + digest/reminder scheduling support

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  channel text not null check (channel in ('email', 'whatsapp')),
  recipient text not null,
  subject text not null,
  body text not null,
  action_url text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);

create index if not exists notification_outbox_status_idx on public.notification_outbox(status, created_at desc);
create index if not exists notification_outbox_user_idx on public.notification_outbox(user_id, created_at desc);

create table if not exists public.notification_digest_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null check (run_type in ('weekly_digest', 'inactivity_reminder')),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  records_created integer not null default 0,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  error text
);
