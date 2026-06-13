"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClarificationLineageExplorer = void 0;
class ClarificationLineageExplorer {
    /**
     * Retrieves dialogue trail for a specific clarification incident
     */
    static getLineage(clarificationId) {
        return [
            {
                id: "CL-ITEM-01",
                sender: "L6_REVIEWER",
                messageText: "Missing raw testing sheet for HVAC Chiller COP ratings.",
                timestamp: "2026-05-16T10:00:00Z"
            },
            {
                id: "CL-ITEM-02",
                sender: "L5_GOVERNOR",
                messageText: "Uploaded HVAC_Commissioning_Report.pdf containing page 12 specs.",
                timestamp: "2026-05-16T12:30:00Z"
            }
        ];
    }
}
exports.ClarificationLineageExplorer = ClarificationLineageExplorer;
