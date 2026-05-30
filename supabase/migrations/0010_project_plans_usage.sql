create table if not exists public.subscription_plans (
  code text primary key,
  name text not null,
  monthly_price_inr numeric(10,2) not null default 0,
  document_credit_limit integer not null check (document_credit_limit >= 0),
  consultant_credit_limit integer not null check (consultant_credit_limit >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.subscription_plans (code, name, monthly_price_inr, document_credit_limit, consultant_credit_limit)
values
  ('starter', 'Starter', 0, 250, 40),
  ('growth', 'Growth', 14999, 1000, 180),
  ('enterprise', 'Enterprise', 49999, 5000, 1000)
on conflict (code) do update
set
  name = excluded.name,
  monthly_price_inr = excluded.monthly_price_inr,
  document_credit_limit = excluded.document_credit_limit,
  consultant_credit_limit = excluded.consultant_credit_limit,
  is_active = true;

create table if not exists public.project_billing_settings (
  project_id uuid primary key references public.projects(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  document_credit_limit integer not null check (document_credit_limit >= 0),
  consultant_credit_limit integer not null check (consultant_credit_limit >= 0),
  topup_document_credits integer not null default 0 check (topup_document_credits >= 0),
  topup_consultant_credits integer not null default 0 check (topup_consultant_credits >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.consultant_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  source text not null default 'manual',
  notes text not null default '',
  credits_burned integer not null default 1 check (credits_burned > 0),
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.project_billing_settings (project_id, plan_code, document_credit_limit, consultant_credit_limit)
select
  p.id,
  'starter',
  sp.document_credit_limit,
  sp.consultant_credit_limit
from public.projects p
join public.subscription_plans sp on sp.code = 'starter'
left join public.project_billing_settings s on s.project_id = p.id
where s.project_id is null;

create or replace view public.project_usage_summary as
select
  p.id as project_id,
  coalesce(s.plan_code, 'starter') as plan_code,
  coalesce(sp.name, 'Starter') as plan_name,
  coalesce(sp.monthly_price_inr, 0) as monthly_price_inr,
  coalesce(s.document_credit_limit, sp.document_credit_limit, 0) as document_credit_limit,
  coalesce(s.consultant_credit_limit, sp.consultant_credit_limit, 0) as consultant_credit_limit,
  coalesce(s.topup_document_credits, 0) as topup_document_credits,
  coalesce(s.topup_consultant_credits, 0) as topup_consultant_credits,
  coalesce(d.documents_used, 0) as documents_used,
  coalesce(cs.consultant_sessions_used, 0) as consultant_sessions_used,
  greatest(coalesce(s.document_credit_limit, sp.document_credit_limit, 0) + coalesce(s.topup_document_credits, 0) - coalesce(d.documents_used, 0), 0) as documents_remaining,
  greatest(coalesce(s.consultant_credit_limit, sp.consultant_credit_limit, 0) + coalesce(s.topup_consultant_credits, 0) - coalesce(cs.consultant_sessions_used, 0), 0) as consultant_credits_remaining
from public.projects p
left join public.project_billing_settings s on s.project_id = p.id
left join public.subscription_plans sp on sp.code = s.plan_code
left join (
  select project_id, count(*)::integer as documents_used
  from public.documents
  group by project_id
) d on d.project_id = p.id
left join (
  select project_id, coalesce(sum(credits_burned), 0)::integer as consultant_sessions_used
  from public.consultant_sessions
  group by project_id
) cs on cs.project_id = p.id;

alter table public.subscription_plans enable row level security;
alter table public.project_billing_settings enable row level security;
alter table public.consultant_sessions enable row level security;

drop policy if exists subscription_plans_select_authenticated on public.subscription_plans;
create policy "subscription_plans_select_authenticated"
on public.subscription_plans for select
to authenticated
using (is_active = true);

drop policy if exists project_billing_settings_select_members on public.project_billing_settings;
create policy "project_billing_settings_select_members"
on public.project_billing_settings for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists project_billing_settings_insert_admins on public.project_billing_settings;
create policy "project_billing_settings_insert_admins"
on public.project_billing_settings for insert
to authenticated
with check (
  public.has_project_role(project_id, array['project_admin', 'super_admin', 'super_user', 'admin'])
);

drop policy if exists project_billing_settings_update_admins on public.project_billing_settings;
create policy "project_billing_settings_update_admins"
on public.project_billing_settings for update
to authenticated
using (public.has_project_role(project_id, array['project_admin', 'super_admin', 'super_user', 'admin']))
with check (public.has_project_role(project_id, array['project_admin', 'super_admin', 'super_user', 'admin']));

drop policy if exists consultant_sessions_select_members on public.consultant_sessions;
create policy "consultant_sessions_select_members"
on public.consultant_sessions for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists consultant_sessions_insert_members on public.consultant_sessions;
create policy "consultant_sessions_insert_members"
on public.consultant_sessions for insert
to authenticated
with check (
  public.has_project_role(project_id, array['owner', 'client', 'consultant', 'architect', 'mep', 'contractor', 'project_admin', 'super_admin', 'super_user', 'admin'])
);
