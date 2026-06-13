"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvProcurementIngestion = void 0;
class CsvProcurementIngestion {
    /**
     * Translates text csv strings into structured rows
     */
    static parseCsv(csvContent) {
        // Basic deterministic splitter simulation
        const lines = csvContent.split("\n").filter((l) => l.trim().length > 0);
        return lines.map((line, idx) => {
            const parts = line.split(",");
            return {
                rowId: idx + 1,
                itemDescription: parts[0] || "General Structural Column",
                vendorName: parts[1] || "Regional Contractor Agency",
                quantity: parseInt(parts[2]) || 10,
                unitCost: parseFloat(parts[3]) || 120.0,
                sustainabilityFlag: parts[4] ? parts[4].toLowerCase().trim() === "true" : false
            };
        });
    }
}
exports.CsvProcurementIngestion = CsvProcurementIngestion;
