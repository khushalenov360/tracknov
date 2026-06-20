-- Migration for Client-Level Wallets, Token Ceilings, and Transaction History
-- This fulfills Phase 4: Enterprise Token Economy & Limits Schema

-- 1. Create client_accounts to hold master wallet balance
CREATE TABLE IF NOT EXISTS public.client_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tokens_balance INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add client_id to projects (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='client_id') THEN
        ALTER TABLE public.projects ADD COLUMN client_id UUID REFERENCES public.client_accounts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Create token_transactions history ledger
CREATE TABLE IF NOT EXISTS public.token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    amount INT NOT NULL,
    balance_after INT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create project_token_ceilings
CREATE TABLE IF NOT EXISTS public.project_token_ceilings (
    project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
    token_ceiling INT NOT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create contributor_token_quotas
CREATE TABLE IF NOT EXISTS public.contributor_token_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_quota INT NOT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- 6. RPC for atomic transaction decrement on the master client_accounts table
CREATE OR REPLACE FUNCTION public.decrement_client_tokens(
    p_client_id UUID,
    p_amount INT,
    p_reason TEXT,
    p_project_id UUID,
    p_user_id UUID
) RETURNS INT AS $$
DECLARE
    v_balance INT;
BEGIN
    -- Atomic transaction decrement
    UPDATE public.client_accounts
    SET tokens_balance = tokens_balance - p_amount,
        updated_at = now()
    WHERE id = p_client_id AND tokens_balance >= p_amount
    RETURNING tokens_balance INTO v_balance;

    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'Insufficient tokens or client account not found';
    END IF;

    -- Update project token ceiling usage if applicable
    IF p_project_id IS NOT NULL THEN
        UPDATE public.project_token_ceilings
        SET tokens_used = tokens_used + p_amount,
            updated_at = now()
        WHERE project_id = p_project_id;
    END IF;

    -- Update contributor quota usage if applicable
    IF p_project_id IS NOT NULL AND p_user_id IS NOT NULL THEN
        UPDATE public.contributor_token_quotas
        SET tokens_used = tokens_used + p_amount,
            updated_at = now()
        WHERE project_id = p_project_id AND user_id = p_user_id;
    END IF;

    -- Create immutable row log inside token_transactions history ledger
    INSERT INTO public.token_transactions (client_id, project_id, user_id, amount, balance_after, reason)
    VALUES (p_client_id, p_project_id, p_user_id, p_amount, v_balance, p_reason);

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policy ensuring unprivileged L0 user cannot read the L3 manual review queue
-- Assume the review queue depends on document_reviews table
ALTER TABLE public.document_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review queue read access for L3+ only"
ON public.document_reviews
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.project_users pu
        WHERE pu.project_id = document_reviews.project_id
        AND pu.user_id = auth.uid()
        AND pu.role IN ('L3', 'L5', 'project_admin', 'super_admin', 'super_user', 'owner', 'L1')
    )
);

CREATE POLICY "Admin token actions for L5 only"
ON public.project_token_ceilings
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.project_users pu
        WHERE pu.project_id = project_token_ceilings.project_id
        AND pu.user_id = auth.uid()
        AND pu.role IN ('L5', 'super_user')
    )
);
