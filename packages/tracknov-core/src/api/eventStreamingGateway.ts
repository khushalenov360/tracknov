import { WebhookPayload } from "../webhooks/signedWebhookEngine";

export class EventStreamingGateway {
  private static subscribers = new Map<string, ((event: WebhookPayload) => void)[]>();

  /**
   * Registers a callback subscription for structural event hooks
   */
  static subscribe(eventType: string, cb: (event: WebhookPayload) => void): void {
    const list = this.subscribers.get(eventType) || [];
    list.push(cb);
    this.subscribers.set(eventType, list);
  }

  /**
   * Broadcasts events to all active developer webhook callbacks
   */
  static publish(event: WebhookPayload): void {
    const list = this.subscribers.get(event.eventType) || [];
    list.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error("Subscriber notification error", err);
      }
    });
  }
}
