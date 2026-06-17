import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { getSupabaseAccessToken } from "@/lib/supabase/request-auth";

export function createClient() {
  const accessToken = getSupabaseAccessToken();
  if (accessToken) {
    return createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
