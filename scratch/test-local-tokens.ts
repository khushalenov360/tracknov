import { Client } from 'pg';

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function testLocal() {
  console.log("Connecting to local Postgres...");
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected successfully.");

  try {
    // 1. Check local function definition
    const defRes = await client.query(`
      SELECT prosrc FROM pg_proc WHERE proname = 'consume_client_tokens';
    `);
    console.log("\n--- Local Function Definition ---\n", defRes.rows[0]?.prosrc);

    // 2. Check local client_token_wallets state
    const userId = '81e20209-8a9b-4922-a319-989a4891e4eb';
    const projectId = '1fabd316-6d0f-4de3-a149-7e23c528aab9';

    // Ensure wallet exists
    await client.query(`
      INSERT INTO public.client_token_wallets (client_user_id, token_balance)
      VALUES ($1, 0)
      ON CONFLICT (client_user_id) DO UPDATE SET token_balance = 0;
    `, [userId]);

    console.log("Local wallet balance reset to 0.");

    // 3. Call consume_client_tokens with 500 tokens (this should trigger the auto top-up to 1,000,000 and then debit 500, resulting in 999,500)
    console.log("Calling local consume_client_tokens with 500 tokens...");
    const consumeRes = await client.query(`
      SELECT public.consume_client_tokens($1, $2, 500, 'Test local consume') as next_balance;
    `, [userId, projectId]);

    console.log("RPC returned new balance:", consumeRes.rows[0]?.next_balance);

    // 4. Verify wallet balance
    const walletRes = await client.query(`
      SELECT token_balance FROM public.client_token_wallets WHERE client_user_id = $1;
    `, [userId]);
    console.log("Wallet balance in DB is:", walletRes.rows[0]?.token_balance);

    // 5. Verify transactions logged
    const txRes = await client.query(`
      SELECT kind, tokens, reason FROM public.client_token_transactions 
      WHERE client_user_id = $1 
      ORDER BY created_at DESC LIMIT 5;
    `, [userId]);
    console.log("Recent Transactions:");
    console.table(txRes.rows);

  } catch (err: any) {
    console.error("Error during test:", err.message);
  } finally {
    await client.end();
  }
}

testLocal();
