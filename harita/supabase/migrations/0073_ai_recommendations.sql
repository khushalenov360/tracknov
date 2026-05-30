-- Migration for AI Recommendations Queue (Section 14)

create table if not exists public.ai_recommendation_queue (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  recommended_action text not null,
  payload jsonb not null default '{}'::jsonb,
  reasoning text,
  status text not null default 'PENDING_L5_APPROVAL' check (status in ('PENDING_L5_APPROVAL', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ai_recommendation_queue_status on public.ai_recommendation_queue(status);

alter table public.ai_recommendation_queue enable row level security;

create policy "ai_recommendations_super_user_only" on public.ai_recommendation_queue
  for all using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.global_role = 'super_user'
    )
  );
