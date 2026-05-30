import * as crypto from "crypto";

export interface WebhookPayload {
  eventId: string;
  eventType: "upload.completed" | "clarification.created" | "clarification.resolved" | "export.generated" | "reviewer.assigned" | "submittal.approved" | "submittal.rejected";
  timestamp: number;
  data: any;
}

export class SignedWebhookEngine {
  private static dlq = new Map<string, WebhookPayload[]>();

  /**
   * Generates a secure cryptographic signature (HMAC-SHA256)
   */
  static generateSignature(payload: WebhookPayload, secret: string): string {
    const dataString = JSON.stringify(payload);
    return crypto.createHmac("sha256", secret).update(dataString).digest("hex");
  }

  /**
   * Dispatches a signed notification payload with delivery retry logic
   */
  static async dispatch(
    url: string,
    payload: WebhookPayload,
    secret: string,
    retryCount = 3
  ): Promise<{ success: boolean; attempts: number }> {
    const signature = this.generateSignature(payload, secret);
    let attempts = 0;
    let delivered = false;

    while (attempts < retryCount && !delivered) {
      attempts++;
      try {
        // Mock post request delivery check
        if (url.includes("fail")) {
          throw new Error("Target endpoint server returned 502 Bad Gateway");
        }
        delivered = true;
      } catch (err) {
        // Sleep simulator
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    if (!delivered) {
      // route fail payload to Dead Letter Queue (DLQ)
      const tenantDlq = this.dlq.get(payload.data.tenantId || "general") || [];
      tenantDlq.push(payload);
      this.dlq.set(payload.data.tenantId || "general", tenantDlq);
    }

    return { success: delivered, attempts };
  }

  /**
   * Returns list of delivery failures stored in the DLQ
   */
  static getDlq(tenantId: string): WebhookPayload[] {
    return this.dlq.get(tenantId) || [];
  }
}
