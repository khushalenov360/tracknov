import { eventBus } from "../event-bus";

export function registerAIValidatorConsumers() {
  eventBus.subscribe(async (event) => {
    switch (event.type) {
      case "DOCUMENT_UPLOADED": {
        const { documentId, projectId } = event.payload;
        console.log(`[AIValidatorConsumer] Triggering AI validation for document: ${documentId} in project: ${projectId}`);
        
        // Mocking AI validation delay
        setTimeout(async () => {
          console.log(`[AIValidatorConsumer] AI validation complete for document: ${documentId}`);
          // In a real implementation, we would update the document metadata or risk score here
        }, 2000);
        break;
      }
      
      case "DOCUMENT_REJECTED": {
        const { documentId, reason } = event.payload;
        console.log(`[AIValidatorConsumer] Learning from rejection. Document: ${documentId}, Reason: ${reason}`);
        // Capture rejection pattern logic here
        break;
      }
    }
  });
}
