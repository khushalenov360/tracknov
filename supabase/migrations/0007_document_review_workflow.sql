alter table public.documents
  add column if not exists owner_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists owner_reviewed_at timestamptz;

alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents
  add constraint documents_status_check
  check (status in ('uploaded', 'owner_approved', 'approved', 'rejected'));
