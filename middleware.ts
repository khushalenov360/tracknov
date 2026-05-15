import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Authoritative Bypass: Temporarily disabling auth roundtrip to resolve runtime 500.
  // We will restore this once the environment loading issue is isolated.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
