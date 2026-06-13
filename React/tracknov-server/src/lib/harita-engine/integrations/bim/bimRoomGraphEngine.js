"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BimRoomGraphEngine = void 0;
class BimRoomGraphEngine {
    /**
     * Generates a structural topological network of rooms on site
     */
    static buildTopology(rooms) {
        return rooms.map((r, i) => {
            // Setup mock topological link strings (e.g. connecting subsequent rooms on same floor)
            const connections = [];
            const neighbor = rooms[i + 1];
            if (neighbor && neighbor.floor === r.floor) {
                connections.push(neighbor.roomId);
            }
            const previous = rooms[i - 1];
            if (previous && previous.floor === r.floor) {
                connections.push(previous.roomId);
            }
            return {
                id: r.roomId,
                label: r.name,
                floor: r.floor,
                connections
            };
        });
    }
}
exports.BimRoomGraphEngine = BimRoomGraphEngine;
