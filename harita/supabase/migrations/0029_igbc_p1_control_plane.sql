-- P1 IGBC workflow control plane: stage gate + override audit

create table if not exists public.override_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  credit_id uuid references public.credits(id) on delete cascade,
  credit_stage_id uuid references public.credit_stages(id) on delete set null,
  stage public.igbc_stage,
  override_type text not null check (override_type in ('design_reset', 'construction_partial', 'construction_full', 'workflow_manual')),
  affected_submittals jsonb not null default '[]'::jsonb,
  reason text not null,
  admin_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists override_logs_project_idx on public.override_logs(project_id, created_at desc);
create index if not exists override_logs_credit_idx on public.override_logs(credit_id, created_at desc);

create or replace function public.enforce_construction_stage_gate()
returns trigger as $$
declare
  design_state text;
begin
  if new.stage = 'CONSTRUCTION'::public.igbc_stage
     and coalesce(new.state, '') in ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CLOSED', 'COMPLETE') then
    select cs.state
      into design_state
      from public.credit_stages cs
     where cs.credit_id = new.credit_id
       and cs.stage = 'DESIGN'::public.igbc_stage
     limit 1;

    if design_state is null then
      raise exception 'Construction stage blocked: missing DESIGN stage record';
    end if;

    if upper(design_state) not in ('APPROVED', 'CLOSED', 'COMPLETE') then
      raise exception 'Construction stage blocked: DESIGN stage must be approved/closed first';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists credit_stages_construction_gate on public.credit_stages;
create trigger credit_stages_construction_gate
before insert or update on public.credit_stages
for each row
execute function public.enforce_construction_stage_gate();
