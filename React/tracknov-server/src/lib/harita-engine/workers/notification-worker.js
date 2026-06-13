"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processNotificationOutbox = processNotificationOutbox;
const admin_1 = require("@/lib/supabase/admin");
function processNotificationOutbox() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const admin = (0, admin_1.createAdminClient)();
        // SECTION 12: Emergency Kill Switch
        const { data: notifyControl } = yield admin
            .from("system_controls")
            .select("is_enabled")
            .eq("feature_name", "notifications")
            .single();
        if (notifyControl && !notifyControl.is_enabled) {
            console.log("[NotificationWorker] Notifications are globally disabled. Skipping.");
            return { ok: true, skipped: true };
        }
        // Fetch pending or retrying jobs
        const { data: jobs, error } = yield admin
            .from("notification_outbox")
            .select("*")
            .in("status", ["PENDING", "RETRYING"])
            .order("created_at", { ascending: true })
            .limit(20);
        if (error) {
            console.error("[NotificationWorker] Failed to fetch outbox", error);
            return { ok: false, error };
        }
        if (!(jobs === null || jobs === void 0 ? void 0 : jobs.length))
            return { ok: true, processed: 0 };
        let processed = 0;
        for (const job of jobs) {
            try {
                // Simulate delivery logic (In production, this calls Resend/SendGrid/Twilio)
                console.log(`[NotificationWorker] Sending ${job.channel} to ${job.recipient}...`);
                // Update to DELIVERED
                yield admin
                    .from("notification_outbox")
                    .update({
                    status: "DELIVERED",
                    sent_at: new Date().toISOString(),
                    attempts: ((_a = job.attempts) !== null && _a !== void 0 ? _a : 0) + 1
                })
                    .eq("id", job.id);
                processed++;
            }
            catch (err) {
                const attempts = ((_b = job.attempts) !== null && _b !== void 0 ? _b : 0) + 1;
                const nextStatus = attempts >= 5 ? "DEAD_LETTER" : "RETRYING";
                yield admin
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
    });
}
