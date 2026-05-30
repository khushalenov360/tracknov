import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export function createClient() {
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      async getAll() {
        try {
          const cookieStore = await cookies();
          return cookieStore.getAll();
        } catch (error) {
          return [];
        }
      },
      async setAll(cookiesToSet) {
        try {
          const cookieStore = await cookies();
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
