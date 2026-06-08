const { Client } = require('pg');
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(process.cwd(), 'apps/tracknov-web/.env.local') });

// Construct the postgres connection string from NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// No wait, NEXT_PUBLIC_SUPABASE_URL is an https url. I don't have the direct postgres connection string unless it's in the env.
// Let's print out the env to see if a DATABASE_URL is there.
console.log(Object.keys(process.env).filter(k => k.includes('DB') || k.includes('URL') || k.includes('POSTGRES')));
