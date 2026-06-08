import { getTeamMembers, getCurrentUser } from "@/lib/data";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const members = await getTeamMembers();
  const currentUser = await getCurrentUser();
  return NextResponse.json({
    currentUser,
    membersCount: members.length,
    members: members.map(m => ({ email: m.email, role: m.role, company: m.company }))
  });
}
