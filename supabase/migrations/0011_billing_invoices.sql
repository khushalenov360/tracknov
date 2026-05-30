create table if not exists public.project_topups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_credits integer not null default 0 check (document_credits >= 0),
  consultant_credits integer not null default 0 check (consultant_credits >= 0),
  amount_inr numeric(10,2) not null default 0 check (amount_inr >= 0),
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invoice_number text not null unique,
  status text not null default 'issued' check (status in ('issued', 'paid', 'void')),
  line_items jsonb not null default '[]'::jsonb,
  subtotal_inr numeric(10,2) not null default 0,
  tax_inr numeric(10,2) not null default 0,
  total_inr numeric(10,2) not null default 0,
  currency text not null default 'INR',
  issued_at timestamptz not null default timezone('utc', now()),
  due_at timestamptz,
  paid_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.project_topups enable row level security;
alter table public.billing_invoices enable row level security;

drop policy if exists project_topups_select_members on public.project_topups;
create policy "project_topups_select_members"
on public.project_topups for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists project_topups_insert_admins on public.project_topups;
create policy "project_topups_insert_admins"
on public.project_topups for insert
to authenticated
with check (public.has_project_role(project_id, array['project_admin', 'super_admin', 'super_user', 'admin']));

drop policy if exists billing_invoices_select_members on public.billing_invoices;
create policy "billing_invoices_select_members"
on public.billing_invoices for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists billing_invoices_insert_admins on public.billing_invoices;
create policy "billing_invoices_insert_admins"
on public.billing_invoices for insert
to authenticated
with check (public.has_project_role(project_id, array['project_admin', 'super_admin', 'super_user', 'admin']));

drop policy if exists billing_invoices_update_admins on public.billing_invoices;
create policy "billing_invoices_update_admins"
on public.billing_invoices for update
to authenticated
using (public.has_project_role(project_id, array['project_admin', 'super_admin', 'super_user', 'admin']))
with check (public.has_project_role(project_id, array['project_admin', 'super_admin', 'super_user', 'admin']));
