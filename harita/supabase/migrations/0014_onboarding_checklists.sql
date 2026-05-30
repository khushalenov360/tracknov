create table if not exists public.onboarding_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  checklist jsonb not null default '{
    "profile_completed": false,
    "project_scope_confirmed": false,
    "first_document_uploaded": false,
    "first_review_completed": false
  }'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(user_id, project_id)
);

alter table public.onboarding_checklists enable row level security;

drop policy if exists onboarding_checklists_select_own on public.onboarding_checklists;
create policy "onboarding_checklists_select_own"
on public.onboarding_checklists for select
to authenticated
using (
  user_id = auth.uid()
  and public.is_project_member(project_id)
);

drop policy if exists onboarding_checklists_insert_own on public.onboarding_checklists;
create policy "onboarding_checklists_insert_own"
on public.onboarding_checklists for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_project_member(project_id)
);

drop policy if exists onboarding_checklists_update_own on public.onboarding_checklists;
create policy "onboarding_checklists_update_own"
on public.onboarding_checklists for update
to authenticated
using (
  user_id = auth.uid()
  and public.is_project_member(project_id)
)
with check (
  user_id = auth.uid()
  and public.is_project_member(project_id)
);
