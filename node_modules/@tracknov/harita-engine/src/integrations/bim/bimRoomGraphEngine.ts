export interface BimRoomNode {
  id: string;
  label: string;
  floor: number;
  connections: string[];
}

export class BimRoomGraphEngine {
  /**
   * Generates a structural topological network of rooms on site
   */
  static buildTopology(rooms: { roomId: string; name: string; floor: number }[]): BimRoomNode[] {
    return rooms.map((r, i) => {
      // Setup mock topological link strings (e.g. connecting subsequent rooms on same floor)
      const connections: string[] = [];
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
