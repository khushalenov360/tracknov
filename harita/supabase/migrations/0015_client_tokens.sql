create table if not exists public.client_token_wallets (
  client_user_id uuid primary key references auth.users(id) on delete cascade,
  token_balance integer not null default 0 check (token_balance >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_token_transactions (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  kind text not null check (kind in ('credit', 'debit')),
  tokens integer not null check (tokens > 0),
  reason text not null,
  actor_id uuid references auth.users(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.credit_client_tokens(
  p_client_user_id uuid,
  p_project_id uuid,
  p_tokens integer,
  p_reason text,
  p_actor_id uuid default null,
  p_meta jsonb default '{}'::jsonb
) returns integer
language plpgsql
security definer
as $$
declare
  next_balance integer;
begin
  if p_tokens is null or p_tokens <= 0 then
    raise exception 'Tokens must be greater than zero';
  end if;

  insert into public.client_token_wallets (client_user_id, token_balance)
  values (p_client_user_id, 0)
  on conflict (client_user_id) do nothing;

  update public.client_token_wallets
  set token_balance = token_balance + p_tokens,
      updated_at = timezone('utc', now())
  where client_user_id = p_client_user_id
  returning token_balance into next_balance;

  insert into public.client_token_transactions (
    client_user_id, project_id, kind, tokens, reason, actor_id, meta
  ) values (
    p_client_user_id, p_project_id, 'credit', p_tokens, coalesce(p_reason, 'Token top-up'), p_actor_id, coalesce(p_meta, '{}'::jsonb)
  );

  return next_balance;
end;
$$;

create or replace function public.consume_client_tokens(
  p_client_user_id uuid,
  p_project_id uuid,
  p_tokens integer,
  p_reason text,
  p_actor_id uuid default null,
  p_meta jsonb default '{}'::jsonb
) returns integer
language plpgsql
security definer
as $$
declare
  current_balance integer;
  next_balance integer;
begin
  if p_tokens is null or p_tokens <= 0 then
    raise exception 'Tokens must be greater than zero';
  end if;

  insert into public.client_token_wallets (client_user_id, token_balance)
  values (p_client_user_id, 0)
  on conflict (client_user_id) do nothing;

  select token_balance
    into current_balance
  from public.client_token_wallets
  where client_user_id = p_client_user_id
  for update;

  if coalesce(current_balance, 0) < p_tokens then
    raise exception 'Insufficient client tokens';
  end if;

  update public.client_token_wallets
  set token_balance = token_balance - p_tokens,
      updated_at = timezone('utc', now())
  where client_user_id = p_client_user_id
  returning token_balance into next_balance;

  insert into public.client_token_transactions (
    client_user_id, project_id, kind, tokens, reason, actor_id, meta
  ) values (
    p_client_user_id, p_project_id, 'debit', p_tokens, coalesce(p_reason, 'Token usage'), p_actor_id, coalesce(p_meta, '{}'::jsonb)
  );

  return next_balance;
end;
$$;

alter table public.client_token_wallets enable row level security;
alter table public.client_token_transactions enable row level security;

drop policy if exists client_token_wallets_select_policy on public.client_token_wallets;
create policy "client_token_wallets_select_policy"
on public.client_token_wallets for select
to authenticated
using (
  client_user_id = auth.uid()
  or exists (
    select 1
    from public.project_members viewer
    join public.project_members client_member on client_member.user_id = client_token_wallets.client_user_id
    where viewer.user_id = auth.uid()
      and viewer.project_id = client_member.project_id
      and viewer.role in ('project_admin', 'super_admin', 'super_user', 'admin')
  )
);

drop policy if exists client_token_transactions_select_policy on public.client_token_transactions;
create policy "client_token_transactions_select_policy"
on public.client_token_transactions for select
to authenticated
using (
  client_user_id = auth.uid()
  or exists (
    select 1
    from public.project_members viewer
    join public.project_members client_member on client_member.user_id = client_token_transactions.client_user_id
    where viewer.user_id = auth.uid()
      and viewer.project_id = client_member.project_id
      and viewer.role in ('project_admin', 'super_admin', 'super_user', 'admin')
  )
);
