"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStreamingGateway = void 0;
class EventStreamingGateway {
    /**
     * Registers a callback subscription for structural event hooks
     */
    static subscribe(eventType, cb) {
        const list = this.subscribers.get(eventType) || [];
        list.push(cb);
        this.subscribers.set(eventType, list);
    }
    /**
     * Broadcasts events to all active developer webhook callbacks
     */
    static publish(event) {
        const list = this.subscribers.get(event.eventType) || [];
        list.forEach((cb) => {
            try {
                cb(event);
            }
            catch (err) {
                console.error("Subscriber notification error", err);
            }
        });
    }
}
exports.EventStreamingGateway = EventStreamingGateway;
EventStreamingGateway.subscribers = new Map();
