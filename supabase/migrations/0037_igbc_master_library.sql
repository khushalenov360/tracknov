-- Master tables for IGBC rating systems
create table if not exists public.rating_systems (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  unique(name, version)
);

create table if not exists public.credit_categories (
  id uuid primary key default gen_random_uuid(),
  rating_system_id uuid not null references public.rating_systems(id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.credit_templates (
  id uuid primary key default gen_random_uuid(),
  rating_system_id uuid not null references public.rating_systems(id) on delete cascade,
  category_id uuid not null references public.credit_categories(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  is_mandatory boolean not null default false,
  documents_required jsonb not null default '[]'::jsonb,
  documentation_summary text,
  max_points numeric not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique(rating_system_id, code)
);

create table if not exists public.credit_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  credit_template_id uuid not null references public.credit_templates(id) on delete cascade,
  scoring_type text not null check (scoring_type in ('FULL', 'PARTIAL', 'SLAB')),
  allowed_values jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.rating_thresholds (
  id uuid primary key default gen_random_uuid(),
  rating_system_id uuid not null references public.rating_systems(id) on delete cascade,
  level_name text not null, -- 'Certified', 'Silver', 'Gold', 'Platinum'
  min_points numeric not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(rating_system_id, level_name)
);

-- Indexes
create index if not exists credit_templates_rating_system_idx on public.credit_templates(rating_system_id);
create index if not exists credit_templates_category_idx on public.credit_templates(category_id);
create index if not exists credit_categories_rating_system_idx on public.credit_categories(rating_system_id);
