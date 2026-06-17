begin;

create table if not exists public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  account_name text not null,
  primary_client_user_id uuid unique references auth.users(id) on delete set null,
  token_balance integer not null default 0 check (token_balance >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.projects
  add column if not exists client_account_id uuid references public.client_accounts(id) on delete set null,
  add column if not exists token_ceiling integer check (token_ceiling is null or token_ceiling >= 0),
  add column if not exists tokens_consumed integer not null default 0 check (tokens_consumed >= 0);

alter table public.project_users
  add column if not exists token_quota integer check (token_quota is null or token_quota >= 0),
  add column if not exists tokens_consumed integer not null default 0 check (tokens_consumed >= 0);

create table if not exists public.token_transactions (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null references public.client_accounts(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  transaction_kind text not null check (transaction_kind in ('credit', 'debit', 'refund', 'adjustment')),
  tokens integer not null check (tokens > 0),
  balance_before integer not null check (balance_before >= 0),
  balance_after integer not null check (balance_after >= 0),
  reason text not null,
  feature_code text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_client_accounts_primary_client_user_id
  on public.client_accounts(primary_client_user_id);

create index if not exists idx_projects_client_account_id
  on public.projects(client_account_id);

create index if not exists idx_token_transactions_account_created_at
  on public.token_transactions(client_account_id, created_at desc);

create index if not exists idx_token_transactions_project_created_at
  on public.token_transactions(project_id, created_at desc);

with client_memberships as (
  select
    pu.project_id,
    pu.user_id,
    coalesce(nullif(p.full_name, ''), nullif(pr.client, ''), nullif(p.email, ''), 'Client Account') as account_name,
    coalesce(ctw.token_balance, 0) as token_balance
  from public.project_users pu
  left join public.projects pr on pr.id = pu.project_id
  left join public.profiles p on p.user_id = pu.user_id
  left join public.client_token_wallets ctw on ctw.client_user_id = pu.user_id
  where pu.role = 'client'
),
inserted_accounts as (
  insert into public.client_accounts (account_name, primary_client_user_id, token_balance)
  select distinct on (cm.user_id)
    cm.account_name,
    cm.user_id,
    cm.token_balance
  from client_memberships cm
  where not exists (
    select 1
    from public.client_accounts existing
    where existing.primary_client_user_id = cm.user_id
  )
  returning id, primary_client_user_id
)
update public.projects p
set client_account_id = ca.id
from public.client_accounts ca,
     client_memberships cm
where p.client_account_id is null
  and cm.user_id = ca.primary_client_user_id
  and cm.project_id = p.id;

insert into public.client_accounts (account_name, token_balance)
select distinct
  pr.client,
  0
from public.projects pr
where pr.client_account_id is null
  and nullif(pr.client, '') is not null
  and not exists (
    select 1
    from public.client_accounts ca
    where ca.primary_client_user_id is null
      and ca.account_name = pr.client
  );

update public.projects p
set client_account_id = ca.id
from public.client_accounts ca
where p.client_account_id is null
  and ca.primary_client_user_id is null
  and ca.account_name = p.client;

create or replace function public.prevent_token_transaction_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'token_transactions ledger is immutable';
end;
$$;

drop trigger if exists trg_prevent_token_transaction_update on public.token_transactions;
create trigger trg_prevent_token_transaction_update
before update on public.token_transactions
for each row execute function public.prevent_token_transaction_mutation();

drop trigger if exists trg_prevent_token_transaction_delete on public.token_transactions;
create trigger trg_prevent_token_transaction_delete
before delete on public.token_transactions
for each row execute function public.prevent_token_transaction_mutation();

create or replace function public.credit_client_account_tokens(
  p_client_account_id uuid,
  p_project_id uuid,
  p_tokens integer,
  p_reason text,
  p_actor_id uuid default null,
  p_subject_user_id uuid default null,
  p_feature_code text default 'manual_credit',
  p_meta jsonb default '{}'::jsonb
) returns table(next_balance integer, transaction_id uuid)
language plpgsql
set search_path = public
as $$
declare
  v_before integer;
  v_after integer;
  v_transaction_id uuid;
begin
  if p_tokens is null or p_tokens <= 0 then
    raise exception 'Tokens must be greater than zero';
  end if;

  select token_balance into v_before
  from public.client_accounts
  where id = p_client_account_id
  for update;

  if v_before is null then
    raise exception 'Client account not found';
  end if;

  update public.client_accounts
  set token_balance = token_balance + p_tokens,
      updated_at = timezone('utc', now())
  where id = p_client_account_id
  returning token_balance into v_after;

  insert into public.token_transactions (
    client_account_id,
    project_id,
    actor_id,
    subject_user_id,
    transaction_kind,
    tokens,
    balance_before,
    balance_after,
    reason,
    feature_code,
    meta
  ) values (
    p_client_account_id,
    p_project_id,
    p_actor_id,
    p_subject_user_id,
    'credit',
    p_tokens,
    v_before,
    v_after,
    coalesce(p_reason, 'Token top-up'),
    coalesce(p_feature_code, 'manual_credit'),
    coalesce(p_meta, '{}'::jsonb)
  )
  returning id into v_transaction_id;

  return query select v_after, v_transaction_id;
end;
$$;

create or replace function public.debit_client_account_tokens(
  p_client_account_id uuid,
  p_project_id uuid,
  p_tokens integer,
  p_reason text,
  p_actor_id uuid default null,
  p_subject_user_id uuid default null,
  p_feature_code text default 'document_audit',
  p_meta jsonb default '{}'::jsonb
) returns table(next_balance integer, transaction_id uuid)
language plpgsql
set search_path = public
as $$
declare
  v_before integer;
  v_after integer;
  v_transaction_id uuid;
  v_project_ceiling integer;
  v_project_consumed integer;
  v_member_quota integer;
  v_member_consumed integer;
begin
  if p_tokens is null or p_tokens <= 0 then
    raise exception 'Tokens must be greater than zero';
  end if;

  select token_balance into v_before
  from public.client_accounts
  where id = p_client_account_id
  for update;

  if v_before is null then
    raise exception 'Client account not found';
  end if;

  if v_before < p_tokens then
    raise exception 'Insufficient client account tokens';
  end if;

  select token_ceiling, tokens_consumed
    into v_project_ceiling, v_project_consumed
  from public.projects
  where id = p_project_id
  for update;

  if v_project_ceiling is not null and coalesce(v_project_consumed, 0) + p_tokens > v_project_ceiling then
    raise exception 'Project token ceiling exceeded';
  end if;

  if p_subject_user_id is not null then
    select token_quota, tokens_consumed
      into v_member_quota, v_member_consumed
    from public.project_users
    where project_id = p_project_id
      and user_id = p_subject_user_id
    for update;

    if v_member_quota is not null and coalesce(v_member_consumed, 0) + p_tokens > v_member_quota then
      raise exception 'Contributor token quota exceeded';
    end if;
  end if;

  update public.client_accounts
  set token_balance = token_balance - p_tokens,
      updated_at = timezone('utc', now())
  where id = p_client_account_id
  returning token_balance into v_after;

  update public.projects
  set tokens_consumed = tokens_consumed + p_tokens
  where id = p_project_id;

  if p_subject_user_id is not null then
    update public.project_users
    set tokens_consumed = tokens_consumed + p_tokens
    where project_id = p_project_id
      and user_id = p_subject_user_id;
  end if;

  insert into public.token_transactions (
    client_account_id,
    project_id,
    actor_id,
    subject_user_id,
    transaction_kind,
    tokens,
    balance_before,
    balance_after,
    reason,
    feature_code,
    meta
  ) values (
    p_client_account_id,
    p_project_id,
    p_actor_id,
    p_subject_user_id,
    'debit',
    p_tokens,
    v_before,
    v_after,
    coalesce(p_reason, 'Token usage'),
    coalesce(p_feature_code, 'document_audit'),
    coalesce(p_meta, '{}'::jsonb)
  )
  returning id into v_transaction_id;

  return query select v_after, v_transaction_id;
end;
$$;

alter table public.client_accounts enable row level security;
alter table public.token_transactions enable row level security;

drop policy if exists client_accounts_select_policy on public.client_accounts;
create policy client_accounts_select_policy
on public.client_accounts for select
to authenticated
using (
  primary_client_user_id = auth.uid()
  or exists (
    select 1
    from public.projects p
    where p.client_account_id = client_accounts.id
      and public.has_project_role(p.id, array['owner', 'project_admin', 'super_admin', 'super_user', 'L1', 'L3', 'L5'])
  )
);

drop policy if exists token_transactions_select_policy on public.token_transactions;
create policy token_transactions_select_policy
on public.token_transactions for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = token_transactions.project_id
      and (
        token_transactions.subject_user_id = auth.uid()
        or token_transactions.actor_id = auth.uid()
        or public.has_project_role(p.id, array['owner', 'project_admin', 'super_admin', 'super_user', 'L1', 'L3', 'L5'])
      )
  )
);

drop policy if exists document_reviews_select_members on public.document_reviews;
drop policy if exists "document_reviews_select_members" on public.document_reviews;
create policy document_reviews_select_reviewer_roles
on public.document_reviews for select
to authenticated
using (
  public.has_project_role(project_id, array['project_admin', 'super_admin', 'super_user', 'L3', 'L5'])
);

drop policy if exists document_reviews_insert_reviewers on public.document_reviews;
drop policy if exists "document_reviews_insert_reviewers" on public.document_reviews;
create policy document_reviews_insert_reviewer_roles
on public.document_reviews for insert
to authenticated
with check (
  public.has_project_role(project_id, array['project_admin', 'super_admin', 'super_user', 'L3', 'L5'])
);

revoke all on public.client_accounts from anon, authenticated;
revoke all on public.token_transactions from anon, authenticated;
grant select on public.client_accounts to authenticated;
grant select on public.token_transactions to authenticated;

revoke execute on function public.credit_client_account_tokens(uuid, uuid, integer, text, uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.debit_client_account_tokens(uuid, uuid, integer, text, uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.credit_client_account_tokens(uuid, uuid, integer, text, uuid, uuid, text, jsonb) to service_role;
grant execute on function public.debit_client_account_tokens(uuid, uuid, integer, text, uuid, uuid, text, jsonb) to service_role;

commit;
