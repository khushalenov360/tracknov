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

  subscribe(handler: EventHandler) {
    this.handlers.push(handler);
  }

  async emit(event: TracknovEvent) {
    await initEventBus();
    console.log(`[EventBus] Emitting ${event.type}`, event.payload);
    
    // Execute all handlers concurrently
    await Promise.allSettled(this.handlers.map(handler => handler(event)));
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
