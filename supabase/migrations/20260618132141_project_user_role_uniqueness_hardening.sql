begin;

-- Normalize the authoritative project membership uniqueness rule at the database layer.
-- The runtime now converges on public.project_users as the active membership table.

drop index if exists public.idx_project_users_one_owner;
create unique index if not exists idx_project_users_one_l1
on public.project_users (project_id)
where role in ('owner', 'L1');

drop index if exists public.idx_project_users_one_project_admin;
create unique index if not exists idx_project_users_one_l3
on public.project_users (project_id)
where role in ('project_admin', 'admin', 'L3');

comment on index public.idx_project_users_one_l1 is
  'Enforces exactly one Project Manager / L1 membership per project in project_users.';

comment on index public.idx_project_users_one_l3 is
  'Enforces exactly one Project Admin / L3 membership per project in project_users.';

commit;
