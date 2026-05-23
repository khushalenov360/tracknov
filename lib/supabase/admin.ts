import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export function createAdminClient() {
  if (!env.supabaseServiceRoleKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to normal client for admin operations.");
    return createClient();
  }

  return createSupabaseClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
