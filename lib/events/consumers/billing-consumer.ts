import { eventBus } from "../event-bus";
import { billingService } from "@/lib/services/billing-service";

export function registerBillingConsumers() {
  eventBus.subscribe(async (event) => {
    switch (event.type) {
      case "TOKEN_DEDUCTED":
        console.log(`[BillingConsumer] Token deducted: ${event.payload.amount} for ${event.payload.reason}`);
        // Additional logic like low balance notification can go here
        break;
      case "DOCUMENT_UPLOADED":
        // In some models, upload might trigger immediate token lock
        break;
    }
  });
}
