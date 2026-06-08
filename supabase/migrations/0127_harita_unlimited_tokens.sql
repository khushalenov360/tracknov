-- Migration 0127: Harita Unlimited Tokens Guard
-- Ensures that if a client's token balance drops below the requested debit amount,
-- their wallet is automatically topped up with 1,000,000 tokens.
-- This guarantees that token consumption will never fail with 'Insufficient client tokens'.

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

  -- Unlimited tokens guard: automatically top up if insufficient
  if coalesce(current_balance, 0) < p_tokens then
    -- Credit 1,000,000 tokens
    update public.client_token_wallets
    set token_balance = token_balance + 1000000,
        updated_at = timezone('utc', now())
    where client_user_id = p_client_user_id;
    
    insert into public.client_token_transactions (
      client_user_id, project_id, kind, tokens, reason, actor_id, meta
    ) values (
      p_client_user_id, p_project_id, 'credit', 1000000, 'Auto Unlimited Token Guard Top-up', p_actor_id, coalesce(p_meta, '{}'::jsonb)
    );

    current_balance := coalesce(current_balance, 0) + 1000000;
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
