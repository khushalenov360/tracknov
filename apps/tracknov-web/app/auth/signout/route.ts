import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (env.isConfigured) {
    const client = createClient();
    await client.auth.signOut();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
