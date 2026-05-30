import { createAdminClient } from "@/lib/supabase/admin";

export type TracknovEvent = 
  | { type: "DOCUMENT_UPLOADED"; payload: { documentId: string; projectId: string; userId: string } }
  | { type: "DOCUMENT_METADATA_UPDATED"; payload: { documentId: string; projectId: string; userId: string } }
  | { type: "DOCUMENT_DELETED"; payload: { documentId: string; projectId: string; userId: string; fileName: string } }
  | { type: "REVIEW_COMPLETED"; payload: { documentId: string; projectId: string; status: string; userId: string } }
  | { type: "DOCUMENT_REJECTED"; payload: { documentId: string; projectId: string; userId: string; reason: string } }
  | { type: "TOKEN_DEDUCTED"; payload: { projectId: string; amount: number; userId: string; reason: string } }
  | { type: "TOKEN_CREDITED"; payload: { projectId: string; amount: number; userId: string; reason: string } }
  | { type: "PROJECT_CREATED"; payload: { projectId: string; userId: string } };

type EventHandler = (event: TracknovEvent) => Promise<void>;

class EventBus {
  private handlers: EventHandler[] = [];
  private initialized = false;
  private MAX_RETRIES = 3;

  subscribe(handler: EventHandler) {
    this.handlers.push(handler);
  }

  async emit(event: TracknovEvent) {
    // We only initialize once
    if (!this.initialized) {
        await initEventBus();
    }
    
    
    
    // Persist event for audit trail (Epic C2)
    await this.persistEvent(event);

    // Execute all handlers concurrently with individual retry logic
    const results = await Promise.allSettled(this.handlers.map(handler => this.executeWithRetry(handler, event)));
    
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`[EventBus] Permanent failure in handler ${index} for event ${event.type}:`, result.reason);
        this.logToDeadLetter(event, result.reason);
      }
    });
  }

  private async persistEvent(event: TracknovEvent) {
    try {
      const admin = createAdminClient();
      const entityTypeMap: Record<string, any> = {
        DOCUMENT_UPLOADED: "document",
        DOCUMENT_METADATA_UPDATED: "document",
        DOCUMENT_DELETED: "document",
        REVIEW_COMPLETED: "document",
        DOCUMENT_REJECTED: "document",
        TOKEN_DEDUCTED: "billing",
        TOKEN_CREDITED: "billing",
        PROJECT_CREATED: "project",
      };

      const payload = event.payload as any;
      await admin.from("system_activity_logs").insert({
        project_id: payload.projectId,
        entity_type: entityTypeMap[event.type] || "project",
        entity_id: payload.documentId || payload.projectId,
        action: event.type.toLowerCase(),
        actor_id: payload.userId,
        summary: `EventBus: ${event.type}`,
        details: event.payload,
      });
    } catch (err) {
      console.error("[EventBus] Failed to persist event:", err);
    }
  }

  private async executeWithRetry(handler: EventHandler, event: TracknovEvent, attempt = 1): Promise<void> {
    try {
      await handler(event);
    } catch (error) {
      if (attempt < this.MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 100; // Exponential backoff
        console.warn(`[EventBus] Handler failed (attempt ${attempt}/${this.MAX_RETRIES}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(handler, event, attempt + 1);
      }
      throw error; // Max retries exhausted
    }
  }

  private logToDeadLetter(event: TracknovEvent, reason: any) {
    console.error(`[DLQ] EVENT_FAILURE: ${event.type} | REASON: ${JSON.stringify(reason)} | PAYLOAD: ${JSON.stringify(event.payload)}`);
  }

  setInitialized() {
    this.initialized = true;
  }

  isInitialized() {
    return this.initialized;
  }
}

export const eventBus = new EventBus();

// Registry for consumers to avoid circular dependencies
export async function initEventBus() {
    if (eventBus.isInitialized()) return;
    
    try {
        // We use a safe check to see if we are in a browser or test environment that might fail dynamic imports
        // In Next.js this works fine, but in some test runners it can be tricky
        const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
        
        if (!isTest) {
            const { registerBillingConsumers } = await import("./consumers/billing-consumer");
            const { registerNotificationConsumers } = await import("./consumers/notification-consumer");
            const { registerAIValidatorConsumers } = await import("./consumers/ai-validator-consumer");

            registerBillingConsumers();
            registerNotificationConsumers();
            registerAIValidatorConsumers();
        }
    } catch (err) {
        console.warn("[EventBus] Dynamic initialization of consumers skipped or failed:", err);
    }
    
    eventBus.setInitialized();
    
}
