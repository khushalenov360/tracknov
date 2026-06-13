"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RageClickDetector = void 0;
class RageClickDetector {
    /**
     * Tracks click sequences to identify elements causing frustration
     */
    static recordClick(sessionId, elementId) {
        const list = this.clicksHistory.get(sessionId) || [];
        const now = Date.now();
        list.push({ elementId, timestamp: now });
        // Maintain last 5 clicks
        if (list.length > 5) {
            list.shift();
        }
        this.clicksHistory.set(sessionId, list);
        // If 4 clicks on the same element within 1 second, flag as a rage click
        if (list.length >= 4) {
            const first = list[list.length - 4];
            const sameElement = list.slice(list.length - 4).every((c) => c.elementId === elementId);
            if (sameElement && (now - first.timestamp) < 1000) {
                return true; // Rage click detected!
            }
        }
        return false;
    }
}
exports.RageClickDetector = RageClickDetector;
RageClickDetector.clicksHistory = new Map(); // sessionId -> clicks
