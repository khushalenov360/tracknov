-- Validation + certification enforcement baseline from final handoff (P0)

-- 1) Rule-governance structure (versioned, immutable-by-design)
create table if not exists public.manual_versions (
  id uuid primary key default gen_random_uuid(),
  rating_system text not null default 'IGBC Green Interiors',
  version_code text not null,
  title text not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (rating_system, version_code)
);

create table if not exists public.rule_sets (
  id uuid primary key default gen_random_uuid(),
  manual_version_id uuid not null references public.manual_versions(id) on delete restrict,
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (manual_version_id, name)
);

create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.rule_sets(id) on delete cascade,
  rule_code text not null,
  title text not null,
  rule_logic jsonb not null default '{}'::jsonb,
  severity text not null default 'error' check (severity in ('error', 'warning')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (rule_set_id, rule_code)
);

create table if not exists public.thresholds (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.rule_sets(id) on delete cascade,
  threshold_key text not null,
  threshold_value numeric not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (rule_set_id, threshold_key)
);

create table if not exists public.mandatory_requirements (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.rule_sets(id) on delete cascade,
  project_credit_id uuid references public.project_credits(id) on delete cascade,
  credit_id uuid references public.credits(id) on delete cascade,
  requirement_key text not null,
  requirement_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.rule_dependencies (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.rules(id) on delete cascade,
  depends_on_rule_id uuid not null references public.rules(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique(rule_id, depends_on_rule_id),
  check (rule_id <> depends_on_rule_id)
);

-- 2) Project manual lock + certification state authority
do $$
begin
  if not exists (select 1 from pg_type where typname = 'certification_state') then
    create type public.certification_state as enum (
      'NOT_STARTED',
      'IN_PROGRESS',
      'BLOCKED',
      'ELIGIBLE',
      'CERTIFIED',
      'INVALID'
    );
  end if;
end $$;

alter table if exists public.projects
  add column if not exists manual_version_id uuid references public.manual_versions(id) on delete restrict,
  add column if not exists certification_state public.certification_state not null default 'NOT_STARTED',
  add column if not exists certification_block_reason text;

create index if not exists idx_projects_manual_version on public.projects(manual_version_id);
create index if not exists idx_projects_cert_state on public.projects(certification_state);

-- Seed a baseline manual version and backfill projects that have none.
insert into public.manual_versions (rating_system, version_code, title, is_active)
values ('IGBC Green Interiors', 'LOCKED-BASELINE-V1', 'Locked Baseline Manual V1', true)
on conflict (rating_system, version_code) do nothing;

update public.projects p
set manual_version_id = mv.id
from public.manual_versions mv
where p.manual_version_id is null
  and mv.rating_system = 'IGBC Green Interiors'
  and mv.version_code = 'LOCKED-BASELINE-V1';

-- 3) Rule immutability guard (for historical reproducibility)
create or replace function public.guard_rule_mutation_when_in_use()
returns trigger
language plpgsql
as $$
declare
  v_in_use boolean;
begin
  if exists (
    select 1
    from public.projects p
    join public.rule_sets rs on rs.manual_version_id = p.manual_version_id
    where rs.id = old.rule_set_id
      and p.id is not null
  ) then
    raise exception 'Rules in active manual versions are immutable; create a new manual version/rule set.';
  end if;

  select exists (
    select 1
    from public.projects p
    join public.rule_sets rs on rs.manual_version_id = p.manual_version_id
    where rs.id = old.rule_set_id
  ) into v_in_use;

  if v_in_use then
    raise exception 'Rules in active manual versions are immutable; create a new manual version/rule set.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_rule_mutation_when_in_use on public.rules;
create trigger trg_guard_rule_mutation_when_in_use
before update on public.rules
for each row
execute function public.guard_rule_mutation_when_in_use();

drop trigger if exists trg_guard_threshold_mutation_when_in_use on public.thresholds;
create trigger trg_guard_threshold_mutation_when_in_use
before update on public.thresholds
for each row
execute function public.guard_rule_mutation_when_in_use();

-- 4) Certification summary update with mandatory-failure blocking semantics
create or replace function public.get_project_certification_summary(
  p_project_id uuid
) returns jsonb
language plpgsql
stable
as $$
declare
  v_total numeric := 0;
  v_earned numeric := 0;
  v_pct numeric := 0;
  v_level text := 'Pre-Certification';
  v_mandatory_total integer := 0;
  v_mandatory_approved integer := 0;
  v_mandatory_failed boolean := false;
  v_state public.certification_state := 'NOT_STARTED';
begin
  select coalesce(sum(max_points), 0), coalesce(sum(earned_points), 0)
  into v_total, v_earned
  from public.credit_scores
  where project_id = p_project_id;

  select
    count(*) filter (where coalesce(pc.is_mandatory, false)),
    count(*) filter (
      where coalesce(pc.is_mandatory, false)
      and upper(coalesce(pc.state, pc.status, '')) in ('APPROVED', 'CLOSED', 'COMPLETE')
    )
  into v_mandatory_total, v_mandatory_approved
  from public.project_credits pc
  where pc.project_id = p_project_id;

  v_mandatory_failed := v_mandatory_total > 0 and v_mandatory_approved < v_mandatory_total;

  if v_total > 0 then
    v_pct := round((v_earned / v_total) * 100, 2);
  end if;

  select cl.level_name
  into v_level
  from public.certification_levels cl
  where cl.rating_system = 'IGBC Green Interiors'
    and v_pct >= cl.min_percentage
    and (cl.max_percentage is null or v_pct <= cl.max_percentage)
  order by cl.sort_order desc
  limit 1;

  if v_total = 0 then
    v_state := 'NOT_STARTED';
  elsif exists (select 1 from public.projects p where p.id = p_project_id and p.manual_version_id is null) then
    v_state := 'BLOCKED';
    v_level := 'Pre-Certification';
  elsif v_mandatory_failed then
    v_state := 'BLOCKED';
  elsif v_pct >= 40 then
    v_state := 'ELIGIBLE';
  else
    v_state := 'IN_PROGRESS';
  end if;

  return jsonb_build_object(
    'project_id', p_project_id,
    'score_pct', v_pct,
    'earned_points', v_earned,
    'max_points', v_total,
    'projected_rating', coalesce(v_level, 'Pre-Certification'),
    'mandatory_total', v_mandatory_total,
    'mandatory_approved', v_mandatory_approved,
    'mandatory_failed', v_mandatory_failed,
    'certification_state', v_state
  );
end;
$$;

-- 5) Derived certification state updater (workflow remains operational even when blocked)
create or replace function public.recompute_project_certification_state(
  p_project_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_summary jsonb;
  v_state public.certification_state;
  v_reason text := null;
begin
  v_summary := public.get_project_certification_summary(p_project_id);
  v_state := coalesce((v_summary->>'certification_state')::public.certification_state, 'NOT_STARTED'::public.certification_state);
  if v_state = 'BLOCKED' then
    if exists (select 1 from public.projects p where p.id = p_project_id and p.manual_version_id is null) then
      v_reason := 'Project manual version is not locked. Certification issuance is blocked until manual is locked.';
    else
      v_reason := 'Mandatory prerequisites are not yet approved. Workflow can continue; certification issuance is blocked.';
    end if;
  end if;

  update public.projects
  set certification_state = v_state,
      certification_block_reason = v_reason
  where id = p_project_id;
end;
$$;

-- 6) Trigger: project_document replacement/resubmission should trigger downstream recalculation.
create or replace function public.on_project_document_change_recompute_cert()
returns trigger
language plpgsql
as $$
declare
  v_project_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  if v_project_id is not null then
    perform public.recompute_credit_scores(v_project_id);
    perform public.recompute_project_certification_state(v_project_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_on_project_document_change_recompute_cert on public.project_document;
create trigger trg_on_project_document_change_recompute_cert
after insert or update or delete on public.project_document
for each row
execute function public.on_project_document_change_recompute_cert();

-- Also recompute certification state when project credit status/points change.
create or replace function public.on_project_credit_change_recompute_cert()
returns trigger
language plpgsql
as $$
begin
  perform public.recompute_credit_scores(coalesce(new.project_id, old.project_id));
  perform public.recompute_project_certification_state(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_on_project_credit_change_recompute_cert on public.project_credits;
create trigger trg_on_project_credit_change_recompute_cert
after insert or update or delete on public.project_credits
for each row
execute function public.on_project_credit_change_recompute_cert();

-- Manual lock guard: once linked, prevent changing manual_version_id unless caller is elevated role.
create or replace function public.guard_project_manual_lock()
returns trigger
language plpgsql
as $$
declare
  v_role text := current_setting('app.current_user_role', true);
begin
  if old.manual_version_id is not null
     and new.manual_version_id is distinct from old.manual_version_id
     and coalesce(v_role, '') not in ('super_user', 'super_admin') then
    raise exception 'manual_version_id is locked for this project. Only super-user override may change it.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_project_manual_lock on public.projects;
create trigger trg_guard_project_manual_lock
before update of manual_version_id on public.projects
for each row
execute function public.guard_project_manual_lock();
