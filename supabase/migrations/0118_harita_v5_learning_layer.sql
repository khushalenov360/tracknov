-- 0011_harita_v5_learning_layer.sql

create table if not exists public.harita_failures (
 id uuid primary key default gen_random_uuid(),
 project_id uuid,
 user_id uuid,
 question text,
 response text,
 correction text,
 failure_type text,
 severity text,
 created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.harita_corrections (
 id uuid primary key default gen_random_uuid(),
 failure_id uuid references public.harita_failures(id) on delete cascade,
 corrected_answer text,
 created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.harita_accuracy_scores (
 id uuid primary key default gen_random_uuid(),
 project_id uuid,
 score_type text,
 score numeric,
 period_start timestamp with time zone,
 period_end timestamp with time zone
);

create table if not exists public.harita_benchmark_results (
 id uuid primary key default gen_random_uuid(),
 benchmark_name text,
 score numeric,
 executed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.harita_shadow_learning (
 id uuid primary key default gen_random_uuid(),
 project_id uuid,
 question text,
 response text,
 accepted boolean,
 corrected boolean,
 created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.harita_feedback (
 id uuid primary key default gen_random_uuid(),
 project_id uuid,
 response_id uuid,
 feedback_type text, -- 'THUMBS_UP', 'THUMBS_DOWN', 'CORRECTION'
 comments text,
 created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.harita_learning_patterns (
 id uuid primary key default gen_random_uuid(),
 category text,
 frequency integer,
 confidence numeric,
 recommendation text,
 created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.harita_failures enable row level security;
alter table public.harita_corrections enable row level security;
alter table public.harita_accuracy_scores enable row level security;
alter table public.harita_benchmark_results enable row level security;
alter table public.harita_shadow_learning enable row level security;
alter table public.harita_feedback enable row level security;
alter table public.harita_learning_patterns enable row level security;

-- Basic service role policies for system execution
create policy "Allow service role harita_failures" on public.harita_failures using (true) with check (true);
create policy "Allow service role harita_corrections" on public.harita_corrections using (true) with check (true);
create policy "Allow service role harita_accuracy_scores" on public.harita_accuracy_scores using (true) with check (true);
create policy "Allow service role harita_benchmark_results" on public.harita_benchmark_results using (true) with check (true);
create policy "Allow service role harita_shadow_learning" on public.harita_shadow_learning using (true) with check (true);
create policy "Allow service role harita_feedback" on public.harita_feedback using (true) with check (true);
create policy "Allow service role harita_learning_patterns" on public.harita_learning_patterns using (true) with check (true);
