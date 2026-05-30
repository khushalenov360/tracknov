-- Migration for Health and Risk Scoring (Section 10)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'health_status_type') then
    create type public.health_status_type as enum ('HEALTHY', 'ATTENTION_NEEDED', 'AT_RISK');
  end if;
end $$;

alter table if exists public.projects
  add column if not exists health_status public.health_status_type not null default 'ATTENTION_NEEDED';

create or replace function public.recompute_project_health_status(p_project_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_total_credits int;
  v_approved_credits int;
  v_desync_count int;
  v_new_status public.health_status_type;
begin
  select count(*) into v_total_credits
  from public.project_credits
  where project_id = p_project_id;

  select count(*) into v_approved_credits
  from public.project_credits
  where project_id = p_project_id
    and status in ('APPROVED', 'CLOSED');

  select count(*) into v_desync_count
  from public.runtime_reconciliation_queue
  where project_id = p_project_id
    and status in ('pending', 'processing', 'retry');

  if v_desync_count > 0 then
    v_new_status := 'AT_RISK';
  elsif v_total_credits > 0 and (v_approved_credits::numeric / v_total_credits) >= 0.8 then
    v_new_status := 'HEALTHY';
  elsif v_total_credits > 0 and (v_approved_credits::numeric / v_total_credits) < 0.5 then
    v_new_status := 'AT_RISK';
  else
    v_new_status := 'ATTENTION_NEEDED';
  end if;

  update public.projects
  set health_status = v_new_status
  where id = p_project_id
    and health_status is distinct from v_new_status;
end;
$$;
