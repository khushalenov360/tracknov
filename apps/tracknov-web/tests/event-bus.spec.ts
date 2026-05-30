import { expect, test } from "@playwright/test";
import { eventBus, initEventBus } from "@tracknov/core/events/event-bus";

test.describe("EventBus Hardening", () => {
  test.beforeEach(async () => {
    await initEventBus();
  });

  test("event bus emits payload to registered handlers", async () => {
    const received: any[] = [];
    
    // Using a manual subscription to track received events in the test
    eventBus.subscribe(async (event) => {
      if (event.type === "DOCUMENT_UPLOADED") {
        received.push(event.payload);
      }
    });

    await eventBus.emit({
      type: "DOCUMENT_UPLOADED",
      payload: { documentId: "doc-1", projectId: "proj-1", userId: "user-1" }
    });

    // We wait a tiny bit for async handlers if needed, though emit is awaited
    expect(received).toContainEqual({ documentId: "doc-1", projectId: "proj-1", userId: "user-1" });
  });

  test("event bus retries handlers before logging permanent failure", async () => {
    let attempts = 0;
    const failingHandler = async (event: any) => {
      if (event.type === "PROJECT_CREATED") {
        attempts += 1;
        throw new Error("transient failure");
      }
    };

    eventBus.subscribe(failingHandler);

    // This will trigger retries (MAX_RETRIES = 3)
    await eventBus.emit({
      type: "PROJECT_CREATED",
      payload: { projectId: "proj-2", userId: "user-2" }
    });

    // MAX_RETRIES is 3 in the implementation
    expect(attempts).toBe(3);
  });

  test("can initialize event bus without errors", async () => {
    await expect(initEventBus()).resolves.not.toThrow();
  });
});
