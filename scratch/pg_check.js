require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function check() {
  const connectionString = process.env.DATABASE_URL; // Wait, maybe it's SUPABASE_URL?
  console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
}
check();
