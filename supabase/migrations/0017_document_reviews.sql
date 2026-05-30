create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_role text,
  action text not null check (action in ('owner_forward', 'admin_approve', 'owner_reject', 'admin_reject', 'resubmit', 'status_override')),
  status_after text not null check (status_after in ('uploaded', 'owner_approved', 'approved', 'rejected')),
  remarks text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.document_reviews enable row level security;

drop policy if exists "document_reviews_select_members" on public.document_reviews;
create policy "document_reviews_select_members"
on public.document_reviews for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists "document_reviews_insert_reviewers" on public.document_reviews;
create policy "document_reviews_insert_reviewers"
on public.document_reviews for insert
to authenticated
with check (
  public.has_project_role(project_id, array['owner', 'project_admin', 'super_admin', 'super_user'])
);

