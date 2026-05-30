import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { runNotificationDigestJobs } from "@/lib/services/notification-jobs";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || !["super_user", "super_admin", "project_admin", "L3", "L5"].includes(user.role)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const result = await runNotificationDigestJobs();
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
