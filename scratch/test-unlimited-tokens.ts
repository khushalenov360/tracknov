import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const userId = '81e20209-8a9b-4922-a319-989a4891e4eb';
const projectId = '1fabd316-6d0f-4de3-a149-7e23c528aab9';

async function runTest() {
  console.log("Checking token wallet balance for user:", userId);
  
  // Get current wallet balance if exists
  const { data: walletBefore, error: getErr } = await supabase
    .from('client_token_wallets')
    .select('token_balance')
    .eq('client_user_id', userId)
    .maybeSingle();
    
  if (getErr) {
    console.error("Error getting wallet:", getErr.message);
  }
  
  console.log("Wallet balance before test:", walletBefore?.token_balance ?? "No wallet exists");

  // Call consume_client_tokens function
  console.log("Calling consume_client_tokens RPC to consume 10 tokens...");
  const { data: balanceAfterConsume, error: consumeErr } = await supabase.rpc('consume_client_tokens', {
    p_client_user_id: userId,
    p_project_id: projectId,
    p_tokens: 10,
    p_reason: 'Testing consume client tokens',
  });

  if (consumeErr) {
    console.error("Consume RPC failed:", consumeErr.message);
    return;
  }

  console.log("RPC returned new balance:", balanceAfterConsume);

  // Now query the wallet again
  const { data: walletAfter } = await supabase
    .from('client_token_wallets')
    .select('token_balance')
    .eq('client_user_id', userId)
    .single();

  console.log("Query wallet directly: new balance is:", walletAfter.token_balance);

  // Let's consume a large amount that exceeds current balance to trigger top-up
  const largeAmount = walletAfter.token_balance + 500;
  console.log(`Calling consume_client_tokens RPC to consume ${largeAmount} tokens (exceeds balance of ${walletAfter.token_balance})...`);
  
  const { data: balanceAfterTopup, error: topupErr } = await supabase.rpc('consume_client_tokens', {
    p_client_user_id: userId,
    p_project_id: projectId,
    p_tokens: largeAmount,
    p_reason: 'Testing unlimited token top-up guard',
  });

  if (topupErr) {
    console.error("Top-up RPC failed:", topupErr.message);
    return;
  }

  console.log("RPC returned new balance after topup:", balanceAfterTopup);

  // Check the wallet again
  const { data: walletFinal } = await supabase
    .from('client_token_wallets')
    .select('token_balance')
    .eq('client_user_id', userId)
    .single();

  console.log("Query wallet directly: final balance is:", walletFinal.token_balance);
  console.log("Test completed successfully!");
}

runTest().catch(console.error);
