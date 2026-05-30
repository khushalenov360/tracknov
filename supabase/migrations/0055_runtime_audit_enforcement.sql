-- Runtime audit enforcement baseline
-- Adds STATE_DESYNC governance, reconciliation queue, observability counters, and alerting records.

begin;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'runtime_entity_type'
  ) then
    create type public.runtime_entity_type as enum (
      'submittal',
      'credit_stage',
      'credit',
      'project',
      'certification'
    );
  end if;
end
$$;

create table if not exists public.runtime_desync (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_type public.runtime_entity_type not null,
  entity_id uuid not null,
  reason text not null,
  status text not null default 'open',
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_runtime_desync_open_entity
  on public.runtime_desync(project_id, entity_type, entity_id)
  where status = 'open';

create table if not exists public.runtime_reconciliation_queue (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_type public.runtime_entity_type not null,
  entity_id uuid not null,
  reason text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_retry_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_runtime_recon_pending
  on public.runtime_reconciliation_queue(status, next_retry_at);

create table if not exists public.runtime_metrics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  metric_name text not null,
  metric_value numeric not null default 0,
  ok boolean not null default true,
  details jsonb not null default '{}'::jsonb,
  measured_at timestamptz not null default now()
);

create index if not exists idx_runtime_metrics_name_time
  on public.runtime_metrics(metric_name, measured_at desc);

create table if not exists public.runtime_alerts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  alert_type text not null,
  severity text not null default 'warning',
  message text not null,
  context jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_runtime_alerts_unacked
  on public.runtime_alerts(acknowledged_at, created_at desc);

create or replace function public.set_runtime_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_runtime_desync_updated_at on public.runtime_desync;
create trigger trg_runtime_desync_updated_at
before update on public.runtime_desync
for each row execute function public.set_runtime_updated_at();

drop trigger if exists trg_runtime_recon_updated_at on public.runtime_reconciliation_queue;
create trigger trg_runtime_recon_updated_at
before update on public.runtime_reconciliation_queue
for each row execute function public.set_runtime_updated_at();

create or replace function public.has_project_desync(p_project_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.runtime_desync
    where project_id = p_project_id
      and status = 'open'
  );
$$;

-- Governance helper: mark project certification as blocked while desync remains.
create or replace function public.recompute_project_runtime_block_state(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_desync boolean;
begin
  select public.has_project_desync(p_project_id) into v_has_desync;
  if v_has_desync then
    update public.projects
      set certification_state = 'BLOCKED',
          certification_block_reason = coalesce(certification_block_reason, 'STATE_DESYNC pending reconciliation')
      where id = p_project_id;
  else
    update public.projects
      set certification_block_reason = null
      where id = p_project_id
        and certification_block_reason = 'STATE_DESYNC pending reconciliation';
  end if;
end;
$$;

commit;
