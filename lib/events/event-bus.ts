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
    await initEventBus();
    console.log(`[EventBus] Emitting ${event.type}`, event.payload);
    
    // Execute all handlers concurrently with individual retry logic
    const results = await Promise.allSettled(this.handlers.map(handler => this.executeWithRetry(handler, event)));
    
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`[EventBus] Permanent failure in handler ${index} for event ${event.type}:`, result.reason);
        // This is our basic DLQ - logging critical failures that exhausted retries
        this.logToDeadLetter(event, result.reason);
      }
    });
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
    // In a production app, this would write to a 'dead_letter_events' table
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

// Deferred initialization to avoid circular dependencies
// This will be called by the services or layout to ensure consumers are registered
export async function initEventBus() {
    if (eventBus.isInitialized()) return;
    
    // Dynamically import consumers to avoid circular dependency at top level
    const { registerBillingConsumers } = await import("./consumers/billing-consumer");
    const { registerNotificationConsumers } = await import("./consumers/notification-consumer");
    const { registerAIValidatorConsumers } = await import("./consumers/ai-validator-consumer");

    registerBillingConsumers();
    registerNotificationConsumers();
    registerAIValidatorConsumers();
    
    eventBus.setInitialized();
    console.log("[EventBus] Initialized with all consumers.");
}
