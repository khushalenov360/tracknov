-- Add idempotency_key to client_token_transactions
alter table public.client_token_transactions 
add column if not exists idempotency_key text unique;

-- Update credit_client_tokens function to support idempotency_key
create or replace function public.credit_client_tokens(
  p_client_user_id uuid,
  p_project_id uuid,
  p_tokens integer,
  p_reason text,
  p_actor_id uuid default null,
  p_meta jsonb default '{}'::jsonb,
  p_idempotency_key text default null
) returns integer
language plpgsql
security definer
as $$
declare
  next_balance integer;
begin
  if p_idempotency_key is not null and exists (
    select 1 from public.client_token_transactions where idempotency_key = p_idempotency_key
  ) then
    select token_balance into next_balance from public.client_token_wallets where client_user_id = p_client_user_id;
    return next_balance;
  end if;

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
    client_user_id, project_id, kind, tokens, reason, actor_id, meta, idempotency_key
  ) values (
    p_client_user_id, p_project_id, 'credit', p_tokens, coalesce(p_reason, 'Token top-up'), p_actor_id, coalesce(p_meta, '{}'::jsonb), p_idempotency_key
  );

  return next_balance;
end;
$$;

-- Update consume_client_tokens function to support idempotency_key
create or replace function public.consume_client_tokens(
  p_client_user_id uuid,
  p_project_id uuid,
  p_tokens integer,
  p_reason text,
  p_actor_id uuid default null,
  p_meta jsonb default '{}'::jsonb,
  p_idempotency_key text default null
) returns integer
language plpgsql
security definer
as $$
declare
  current_balance integer;
  next_balance integer;
begin
  if p_idempotency_key is not null and exists (
    select 1 from public.client_token_transactions where idempotency_key = p_idempotency_key
  ) then
    select token_balance into next_balance from public.client_token_wallets where client_user_id = p_client_user_id;
    return next_balance;
  end if;

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
    client_user_id, project_id, kind, tokens, reason, actor_id, meta, idempotency_key
  ) values (
    p_client_user_id, p_project_id, 'debit', p_tokens, coalesce(p_reason, 'Token usage'), p_actor_id, coalesce(p_meta, '{}'::jsonb), p_idempotency_key
  );

  return next_balance;
end;
$$;
