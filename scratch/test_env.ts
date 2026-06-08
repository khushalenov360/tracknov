import { env } from "../lib/env";
console.log("SUPABASE_URL:", env.supabaseUrl);
console.log("SUPABASE_SERVICE_ROLE_KEY length:", env.supabaseServiceRoleKey.length);
