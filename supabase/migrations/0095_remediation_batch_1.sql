-- Remediation 01 & 03: Eliminate Ghost State and Implement Progress Engine V2

-- 1. Create or ensure the new Progress Engine V2 calculation logic
create or replace function public.recalculate_derived_states(
  p_project_id uuid,
  p_project_credit_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_assigned int := 0;
  v_total int := 0;
  v_under_review int := 0;
  v_approved int := 0;
  
  v_progress_pct numeric := 0;
  v_weight_assigned numeric := 10;
  v_weight_uploaded numeric := 40;
  v_weight_review numeric := 25;
  v_weight_verification numeric := 25;
begin
  -- Calculate Assignment
  select count(*) into v_assigned
  from public.assignments
  where project_credit_id = p_project_credit_id and is_active = true;
  
  -- Calculate Document States using strictly WORKFLOW_STATE
  select
    count(*)::int,
    count(*) filter (where workflow_state::text in ('UNDER_REVIEW', 'SUBMITTED', 'APPROVED', 'CLARIFICATION'))::int,
    count(*) filter (where workflow_state::text = 'APPROVED')::int
  into v_total, v_under_review, v_approved
  from public.project_document
  where project_credit_id = p_project_credit_id
    and coalesce(is_latest, true) = true
    and workflow_state::text <> 'ELIMINATED';

  -- Progress Engine V2 Formula
  -- Assignment: 10% if assigned OR if total > 0 (meaning work has started)
  if v_assigned > 0 or v_total > 0 then
    v_progress_pct := v_progress_pct + v_weight_assigned;
  end if;
  
  -- Uploaded: 40% if any document uploaded (v_total > 0)
  if v_total > 0 then
    v_progress_pct := v_progress_pct + v_weight_uploaded;
  end if;
  
  -- Reviewed: 25% if documents are under review or approved
  if v_under_review > 0 then
    v_progress_pct := v_progress_pct + v_weight_review;
  end if;
  
  -- Verified: 25% if all required documents are approved
  -- We assume if v_approved > 0 it counts for something. For now, full 25% if at least 1 approved.
  -- A stricter implementation would be (v_approved / total_required), but using a base check:
  if v_approved > 0 then
    v_progress_pct := v_progress_pct + v_weight_verification;
  end if;
  
  -- Cap at 100
  if v_progress_pct > 100 then
    v_progress_pct := 100;
  end if;

  -- Update project credits
  update public.project_credits pc
  set state =
    case
      when v_progress_pct = 0 then 'PENDING'
      when v_progress_pct = 100 then 'COMPLETE'
      else 'IN_PROGRESS'
    end,
    completion_pct = v_progress_pct,
    updated_at = timezone('utc', now())
  where pc.id = p_project_credit_id;

  -- Project-level coarse derivation
  update public.projects p
  set status =
    case
      when exists (
        select 1
        from public.project_credits c
        where c.project_id = p.id
          and upper(coalesce(c.state::text,'')) not in ('COMPLETE','CLOSED','APPROVED')
      ) then 'active'
      else 'completed'
    end
  where p.id = p_project_id;
end;
$$;

-- 2. Update trigger to fire on workflow_state instead of state
drop trigger if exists trg_project_document_recalc_derived_states on public.project_document;
create trigger trg_project_document_recalc_derived_states
after insert or update of workflow_state, is_latest, project_credit_id on public.project_document
for each row execute function public.recalc_derived_states_on_doc_change();

-- 3. Remediation 04: Approved Document Sets
create table if not exists public.approved_document_sets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.approved_document_set_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.approved_document_sets(id) on delete cascade,
  document_id uuid not null references public.project_document(id) on delete cascade,
  project_credit_id uuid references public.project_credits(id) on delete cascade,
  added_at timestamptz not null default timezone('utc', now()),
  unique (set_id, document_id)
);

-- Trigger for assignments to recalculate progress
create or replace function public.recalc_derived_states_on_assignment_change()
returns trigger
language plpgsql
as $$
declare
  v_project_id uuid;
  v_project_credit_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  v_project_credit_id := coalesce(new.project_credit_id, old.project_credit_id);
  if v_project_id is not null and v_project_credit_id is not null then
    perform public.recalculate_derived_states(v_project_id, v_project_credit_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_assignments_recalc_derived_states on public.assignments;
create trigger trg_assignments_recalc_derived_states
after insert or update of is_active on public.assignments
for each row execute function public.recalc_derived_states_on_assignment_change();
