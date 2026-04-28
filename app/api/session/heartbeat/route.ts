import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const client = createClient();
  await client.auth.getUser();
  return NextResponse.json({ ok: true });
}

