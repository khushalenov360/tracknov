-- Migration: 0130_guidebook_embeddings.sql
-- Add pgvector and table for guidebook embeddings

create extension if not exists vector;

create table if not exists public.guidebook_embeddings (
  id uuid primary key default gen_random_uuid(),
  guidebook_id uuid not null references public.project_guidebooks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  chunk_text text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(768),
  created_at timestamptz not null default timezone('utc', now())
);

-- Index for vector search (using HNSW for better performance)
create index if not exists guidebook_embeddings_embedding_idx on public.guidebook_embeddings using hnsw (embedding vector_cosine_ops);
create index if not exists guidebook_embeddings_project_idx on public.guidebook_embeddings(project_id);

alter table public.guidebook_embeddings enable row level security;

drop policy if exists guidebook_embeddings_select on public.guidebook_embeddings;
create policy guidebook_embeddings_select
on public.guidebook_embeddings
for select
using (public.is_project_member(project_id));

drop policy if exists guidebook_embeddings_insert on public.guidebook_embeddings;
create policy guidebook_embeddings_insert
on public.guidebook_embeddings
for insert
with check (public.has_project_role(project_id, array['project_admin', 'super_user']));

-- Function for similarity search
create or replace function match_guidebook_embeddings (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_project_id uuid
)
returns table (
  id uuid,
  guidebook_id uuid,
  chunk_text text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    guidebook_embeddings.id,
    guidebook_embeddings.guidebook_id,
    guidebook_embeddings.chunk_text,
    guidebook_embeddings.metadata,
    1 - (guidebook_embeddings.embedding <=> query_embedding) as similarity
  from guidebook_embeddings
  where guidebook_embeddings.project_id = filter_project_id
    and 1 - (guidebook_embeddings.embedding <=> query_embedding) > match_threshold
  order by guidebook_embeddings.embedding <=> query_embedding
  limit match_count;
$$;
