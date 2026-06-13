"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevitMetadataExtractor = void 0;
class RevitMetadataExtractor {
    /**
     * Parses building models and extracts rooms, mechanical zones, and schedule structures
     */
    static extractModelMetadata(fileContent) {
        // Highly deterministic mock parser simulation for IFC and RVT formats
        const mockRooms = [
            {
                roomId: "RM-101",
                name: "Mechanical Plantroom A",
                floor: 1,
                areaSqFt: 1200,
                materials: [
                    { materialId: "steel-frame-01", volumeCuFt: 450 },
                    { materialId: "concrete-grade-c30", volumeCuFt: 1200 }
                ]
            },
            {
                roomId: "RM-204",
                name: "Conference Hall East",
                floor: 2,
                areaSqFt: 850,
                materials: [
                    { materialId: "low-voc-gypsum-board", volumeCuFt: 180 },
                    { materialId: "ecobuild-recycled-steel", volumeCuFt: 95 }
                ]
            }
        ];
        const extractedSchedules = [
            { name: "Structural Column Schedule", rowsCount: 42 },
            { name: "HVAC Equipment Inventory", rowsCount: 18 },
            { name: "Electrical Lighting Loads", rowsCount: 54 }
        ];
        return {
            rooms: mockRooms,
            extractedSchedules,
            parseSuccessRate: 98.4
        };
    }
}
exports.RevitMetadataExtractor = RevitMetadataExtractor;
