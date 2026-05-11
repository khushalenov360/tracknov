import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { env } from "@/lib/env";

export function createClient() {
  // Opt out of caching/static generation for any route that calls this.
  noStore();

  // Next.js may type `cookies()` as async in some build targets; this keeps
  // our shared server client API stable for existing callsites.
  const cookieStore = cookies() as any;

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value, ...(options as object) });
      },
      remove(name: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value: "", ...(options as object) });
      },
    },
  });
}
