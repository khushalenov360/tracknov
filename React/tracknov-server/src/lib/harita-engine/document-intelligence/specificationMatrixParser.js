"use strict";
/**
 * Tracknov Document Intelligence - Specification Matrix Parser
 * Specifically targets engineering matrices like HVAC capacity grids, lighting power density schedules, and equipment parameters.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecificationMatrixParser = void 0;
class SpecificationMatrixParser {
    /**
     * Parses engineering schedules to identify specific mechanical/electrical equipment specs.
     */
    static parseMatrix(headers, rows) {
        const equipmentList = [];
        // Find columns representing tags and descriptions
        const tagColIndex = headers.findIndex(h => /tag|code|id|equipment/i.test(h));
        const descColIndex = headers.findIndex(h => /description|name|type|model/i.test(h));
        if (tagColIndex === -1)
            return [];
        for (const row of rows) {
            if (row.length <= tagColIndex)
                continue;
            const equipmentTag = row[tagColIndex];
            if (!equipmentTag || equipmentTag.trim() === "" || equipmentTag.length > 20)
                continue; // Skip invalid tags
            const description = descColIndex !== -1 && row.length > descColIndex ? row[descColIndex] : "Mechanical Equipment";
            const properties = [];
            // Extract all other cells as property specs
            for (let c = 0; c < row.length; c++) {
                if (c === tagColIndex || c === descColIndex)
                    continue;
                if (c >= headers.length)
                    continue;
                const rawValue = row[c];
                if (!rawValue || rawValue.trim() === "")
                    continue;
                const headerName = headers[c];
                // Detect units (e.g. CFM, kW, TR, COP, W/sq.ft)
                const unitMatch = rawValue.match(/\b(cfm|kw|tr|cop|w\/sq\.ft|lps|v|hp|db|wb|gpm)\b/i);
                const unit = unitMatch ? unitMatch[1] : undefined;
                properties.push({
                    key: headerName,
                    value: rawValue,
                    unit,
                });
            }
            equipmentList.push({
                equipmentTag,
                description,
                properties,
            });
        }
        return equipmentList;
    }
}
exports.SpecificationMatrixParser = SpecificationMatrixParser;
