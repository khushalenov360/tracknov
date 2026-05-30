-- AI Readiness and Data Completeness Migration

-- 1. Enable pgvector extension for embeddings
create extension if not exists vector;

-- 2. Embeddings for RAG
create table if not exists public.embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade,
  content text not null,
  embedding vector(1536), -- Standard OpenAI embedding dimension
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- 3. Rejection patterns for intelligence
create table if not exists public.rejection_patterns (
  id uuid primary key default gen_random_uuid(),
  credit_id uuid references public.credits(id) on delete set null,
  doc_category text,
  rejection_reason text not null,
  suggested_fix text,
  occurrence_count integer default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 4. Clients table (V2.8 requirement)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  company_details jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- 5. RLS for new tables
alter table public.embeddings enable row level security;
alter table public.rejection_patterns enable row level security;
alter table public.clients enable row level security;

-- Embeddings policies
create policy "embeddings_select_policy" on public.embeddings
  for select to authenticated using (true); -- Usually internal, but allowing read for now

-- Rejection patterns policies
create policy "rejection_patterns_select_policy" on public.rejection_patterns
  for select to authenticated using (true);

-- Clients policies
create policy "clients_select_policy" on public.clients
  for select to authenticated using (true);

create policy "clients_insert_admin_policy" on public.clients
  for insert with check (
    exists (
      select 1 from auth.users
      where id = auth.uid()
      and raw_user_meta_data->>'role' in ('super_user', 'super_admin')
    )
  );

-- Indexes for performance
create index if not exists idx_embeddings_document_id on public.embeddings(document_id);
create index if not exists idx_rejection_patterns_credit_id on public.rejection_patterns(credit_id);
create index if not exists idx_rejection_patterns_category on public.rejection_patterns(doc_category);
