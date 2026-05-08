-- 0044_master_library_policies.sql
-- Ensure master library tables are readable by all authenticated users

-- 1. Rating System
alter table public.rating_system enable row level security;
drop policy if exists "rating_system_select_authenticated" on public.rating_system;
create policy "rating_system_select_authenticated" on public.rating_system
  for select to authenticated using (true);

-- 2. Credit Category
alter table public.credit_category enable row level security;
drop policy if exists "credit_category_select_authenticated" on public.credit_category;
create policy "credit_category_select_authenticated" on public.credit_category
  for select to authenticated using (true);

-- 3. Credit Template
alter table public.credit_template enable row level security;
drop policy if exists "credit_template_select_authenticated" on public.credit_template;
create policy "credit_template_select_authenticated" on public.credit_template
  for select to authenticated using (true);

-- 4. Credit Scoring Rule
alter table public.credit_scoring_rule enable row level security;
drop policy if exists "credit_scoring_rule_select_authenticated" on public.credit_scoring_rule;
create policy "credit_scoring_rule_select_authenticated" on public.credit_scoring_rule
  for select to authenticated using (true);

-- 5. Rating Threshold
alter table public.rating_threshold enable row level security;
drop policy if exists "rating_threshold_select_authenticated" on public.rating_threshold;
create policy "rating_threshold_select_authenticated" on public.rating_threshold
  for select to authenticated using (true);
