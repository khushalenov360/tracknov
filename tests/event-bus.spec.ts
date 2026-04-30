import { expect, test } from "@playwright/test";
import { EventBus } from "../lib/events/event-bus";

test("event bus emits payload to registered handlers", async () => {
  const bus = new EventBus();
  const received: Array<{ documentId: string }> = [];
  bus.on("document.status_updated", "collector", async (payload: { documentId: string }) => {
    received.push(payload);
  });

  await bus.emit("document.status_updated", { documentId: "doc-1" });
  expect(received).toEqual([{ documentId: "doc-1" }]);
});

test("event bus captures dead letters for failed handlers", async () => {
  const bus = new EventBus();
  bus.on("document.uploaded", "fails", async () => {
    throw new Error("handler failed");
  });

  await bus.emit("document.uploaded", { documentId: "doc-2" });
  const deadLetters = bus.getDeadLetters();
  expect(deadLetters).toHaveLength(1);
  expect(deadLetters[0].event).toBe("document.uploaded");
  expect(deadLetters[0].handler).toBe("fails");
});

test("event bus retries handlers before dead-lettering", async () => {
  const bus = new EventBus();
  let attempts = 0;
  bus.on(
    "document.status_updated",
    "retry-once",
    async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error("transient failure");
      }
    },
    { maxRetries: 1 },
  );

  await bus.emit("document.status_updated", { documentId: "doc-3" });
  expect(attempts).toBe(2);
  expect(bus.getDeadLetters()).toHaveLength(0);
});
