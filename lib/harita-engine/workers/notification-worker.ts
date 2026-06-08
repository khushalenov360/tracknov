import { createAdminClient } from "@/lib/supabase/admin";

export async function processNotificationOutbox() {
  const admin = createAdminClient();

  // SECTION 12: Emergency Kill Switch
  const { data: notifyControl } = await admin
    .from("system_controls")
    .select("is_enabled")
    .eq("feature_name", "notifications")
    .single();

  if (notifyControl && !notifyControl.is_enabled) {
    console.log("[NotificationWorker] Notifications are globally disabled. Skipping.");
    return { ok: true, skipped: true };
  }

  // Fetch pending or retrying jobs
  const { data: jobs, error } = await admin
    .from("notification_outbox")
    .select("*")
    .in("status", ["PENDING", "RETRYING"])
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("[NotificationWorker] Failed to fetch outbox", error);
    return { ok: false, error };
  }

  if (!jobs?.length) return { ok: true, processed: 0 };

  let processed = 0;
  for (const job of jobs) {
    try {
      // Simulate delivery logic (In production, this calls Resend/SendGrid/Twilio)
      console.log(`[NotificationWorker] Sending ${job.channel} to ${job.recipient}...`);
      
      // Update to DELIVERED
      await admin
        .from("notification_outbox")
        .update({
          status: "DELIVERED",
          sent_at: new Date().toISOString(),
          attempts: (job.attempts ?? 0) + 1
        })
        .eq("id", job.id);
      
      processed++;
    } catch (err: any) {
      const attempts = (job.attempts ?? 0) + 1;
      const nextStatus = attempts >= 5 ? "DEAD_LETTER" : "RETRYING";
      
      await admin
        .from("notification_outbox")
        .update({
          status: nextStatus,
          last_error: err.message || "Unknown delivery error",
          attempts
        })
        .eq("id", job.id);
    }
  }

  return { ok: true, processed };
}
