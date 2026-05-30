-- P0 closure: DB-native validation engine, scoring engine, and assignment enforcement helpers.

create table if not exists public.validation_rules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  project_credit_id uuid references public.project_credits(id) on delete cascade,
  credit_id uuid references public.credits(id) on delete cascade,
  doc_category text,
  rule_name text not null,
  required_keywords text[] not null default '{}',
  min_file_size_kb integer,
  severity text not null default 'error' check (severity in ('error', 'warning')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_validation_rules_project
  on public.validation_rules(project_id);
create index if not exists idx_validation_rules_credit
  on public.validation_rules(project_credit_id, credit_id);

create table if not exists public.validation_results (
  id uuid primary key default gen_random_uuid(),
  submittal_id uuid not null references public.submittals(id) on delete cascade,
  document_id uuid references public.project_document(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  rule_id uuid not null references public.validation_rules(id) on delete cascade,
  status text not null check (status in ('pass', 'warning', 'fail')),
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_validation_results_submittal
  on public.validation_results(submittal_id, created_at desc);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_credit_id uuid not null references public.project_credits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(project_credit_id, user_id)
);

create index if not exists idx_assignments_project_credit
  on public.assignments(project_credit_id, is_active);

create table if not exists public.certification_levels (
  id uuid primary key default gen_random_uuid(),
  rating_system text not null default 'IGBC Green Interiors',
  level_name text not null,
  min_percentage numeric not null,
  max_percentage numeric,
  sort_order integer not null default 0,
  unique(rating_system, level_name)
);

insert into public.certification_levels(rating_system, level_name, min_percentage, max_percentage, sort_order)
values
  ('IGBC Green Interiors', 'Certified', 40, 49.999, 1),
  ('IGBC Green Interiors', 'Silver', 50, 59.999, 2),
  ('IGBC Green Interiors', 'Gold', 60, 79.999, 3),
  ('IGBC Green Interiors', 'Platinum', 80, null, 4)
on conflict (rating_system, level_name) do update
set min_percentage = excluded.min_percentage,
    max_percentage = excluded.max_percentage,
    sort_order = excluded.sort_order;

create table if not exists public.credit_scores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_credit_id uuid not null references public.project_credits(id) on delete cascade,
  earned_points numeric not null default 0,
  max_points numeric not null default 0,
  is_mandatory boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  unique(project_credit_id)
);

create index if not exists idx_credit_scores_project
  on public.credit_scores(project_id);

create or replace function public.is_assigned_user(
  p_project_credit_id uuid,
  p_user_id uuid
) returns boolean
language sql
stable
as $$
  with assignment_match as (
    select 1
    from public.assignments a
    where a.project_credit_id = p_project_credit_id
      and a.user_id = p_user_id
      and a.is_active = true
    limit 1
  ),
  project_credit_match as (
    select 1
    from public.project_credits pc
    where pc.id = p_project_credit_id
      and pc.assigned_user_id = p_user_id
    limit 1
  )
  select exists(select 1 from assignment_match)
      or exists(select 1 from project_credit_match);
$$;

create or replace function public.validate_submittal(
  p_submittal_id uuid,
  p_actor_id uuid default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_project_id uuid;
  v_project_credit_id uuid;
  v_credit_id uuid;
  v_has_fail boolean := false;
  v_has_warning boolean := false;
  v_rules_checked integer := 0;
  v_result_status text;
  v_message text;
  v_doc record;
  v_rule record;
  v_blob text;
begin
  select s.project_id, cs.project_credit_id, s.credit_id
  into v_project_id, v_project_credit_id, v_credit_id
  from public.submittals s
  left join public.credit_stages cs on cs.id = s.credit_stage_id
  where s.id = p_submittal_id;

  if v_project_id is null then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array('Submittal not found.'));
  end if;

  delete from public.validation_results
  where submittal_id = p_submittal_id;

  for v_doc in
    select d.id, d.file_name, d.notes, d.doc_category, d.file_type, d.file_path
    from public.project_document d
    where d.submittal_id = p_submittal_id
      and d.is_latest = true
  loop
    for v_rule in
      select vr.*
      from public.validation_rules vr
      where vr.is_active = true
        and (vr.project_id is null or vr.project_id = v_project_id)
        and (vr.project_credit_id is null or vr.project_credit_id = v_project_credit_id)
        and (vr.credit_id is null or vr.credit_id = v_credit_id)
        and (vr.doc_category is null or lower(vr.doc_category) = lower(coalesce(v_doc.doc_category, '')))
    loop
      v_rules_checked := v_rules_checked + 1;
      v_result_status := 'pass';
      v_message := 'Validation passed';
      v_blob := lower(coalesce(v_doc.file_name, '') || ' ' || coalesce(v_doc.notes, ''));

      if coalesce(v_rule.min_file_size_kb, 0) > 0 then
        -- file size can be tracked later in metadata; keep this rule evaluable via note/file tokens for now
        if length(v_blob) = 0 then
          v_result_status := case when v_rule.severity = 'warning' then 'warning' else 'fail' end;
          v_message := 'Missing descriptive metadata for file-size validation proxy.';
        end if;
      end if;

      if array_length(v_rule.required_keywords, 1) is not null then
        if exists (
          select 1
          from unnest(v_rule.required_keywords) kw
          where position(lower(trim(kw)) in v_blob) = 0
        ) then
          v_result_status := case when v_rule.severity = 'warning' then 'warning' else 'fail' end;
          v_message := format('Rule "%s" failed: required keywords missing.', v_rule.rule_name);
        end if;
      end if;

      insert into public.validation_results (
        submittal_id, document_id, project_id, rule_id, status, message, details
      ) values (
        p_submittal_id,
        v_doc.id,
        v_project_id,
        v_rule.id,
        v_result_status,
        v_message,
        jsonb_build_object(
          'rule_name', v_rule.rule_name,
          'doc_category', v_doc.doc_category,
          'file_name', v_doc.file_name,
          'checked_by', p_actor_id
        )
      );

      if v_result_status = 'fail' then
        v_has_fail := true;
      elsif v_result_status = 'warning' then
        v_has_warning := true;
      end if;
    end loop;
  end loop;

  if v_rules_checked = 0 then
    return jsonb_build_object(
      'ok', true,
      'checked_rules', 0,
      'status', 'no_rules',
      'message', 'No active validation rules matched.'
    );
  end if;

  return jsonb_build_object(
    'ok', not v_has_fail,
    'checked_rules', v_rules_checked,
    'status', case when v_has_fail then 'fail' when v_has_warning then 'warning' else 'pass' end,
    'message', case when v_has_fail then 'Validation failed for one or more rules.' when v_has_warning then 'Validation passed with warnings.' else 'Validation passed.' end
  );
end;
$$;

create or replace function public.recompute_credit_scores(
  p_project_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  insert into public.credit_scores(project_id, project_credit_id, earned_points, max_points, is_mandatory, updated_at)
  select
    pc.project_id,
    pc.id as project_credit_id,
    case
      when upper(coalesce(pc.state, pc.status, '')) in ('APPROVED', 'CLOSED') then coalesce(pc.max_points, 0)
      else 0
    end as earned_points,
    coalesce(pc.max_points, 0) as max_points,
    coalesce(pc.is_mandatory, false) as is_mandatory,
    timezone('utc', now())
  from public.project_credits pc
  where pc.project_id = p_project_id
  on conflict (project_credit_id) do update
  set earned_points = excluded.earned_points,
      max_points = excluded.max_points,
      is_mandatory = excluded.is_mandatory,
      updated_at = excluded.updated_at;
end;
$$;

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
begin
  select coalesce(sum(max_points), 0), coalesce(sum(earned_points), 0)
  into v_total, v_earned
  from public.credit_scores
  where project_id = p_project_id;

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

  return jsonb_build_object(
    'project_id', p_project_id,
    'score_pct', v_pct,
    'earned_points', v_earned,
    'max_points', v_total,
    'projected_rating', coalesce(v_level, 'Pre-Certification')
  );
end;
$$;
