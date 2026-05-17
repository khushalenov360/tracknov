-- Optimization: Evidence Indexing
create index if not exists idx_project_document_project_id on public.project_document(project_id);
create index if not exists idx_project_document_project_credit_id on public.project_document(project_credit_id);
create index if not exists idx_project_document_doc_category on public.project_document(doc_category);
create index if not exists idx_project_document_file_hash on public.project_document(file_hash);

-- Optimization: Submittal Lookups
create index if not exists idx_submittals_project_id on public.submittals(project_id);
create index if not exists idx_submittals_state on public.submittals(state);

-- Optimization: Activity & Metrics
create index if not exists idx_reviewer_activity_reviewer_id on public.reviewer_activity_metrics(reviewer_id);
create index if not exists idx_ai_recommendation_project_id on public.ai_recommendation_logs(project_id);

-- Performance Target: Evidence Explorer < 2sec
-- Ensure project_document table has updated stats
analyze public.project_document;
analyze public.submittals;
analyze public.project_credits;
