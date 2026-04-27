import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (!env.isConfigured) {
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        request.cookies.set({ name, value, ...(options as object) });
        response.cookies.set({ name, value, ...(options as object) });
      },
      remove(name: string, options: Record<string, unknown>) {
        request.cookies.set({ name, value: "", ...(options as object) });
        response.cookies.set({ name, value: "", ...(options as object) });
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
