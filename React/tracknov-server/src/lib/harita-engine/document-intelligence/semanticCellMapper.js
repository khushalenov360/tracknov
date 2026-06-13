"use strict";
/**
 * Tracknov Document Intelligence - Semantic Cell Mapper
 * Extracts high-level engineering metrics and validates cell values against sustainability bounds.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticCellMapper = void 0;
class SemanticCellMapper {
    /**
     * Translates a cell value into its clean physical meaning and handles range bounds checking.
     */
    static mapCell(value, header) {
        const rawClean = value.trim();
        // Extract numerical segment
        const numMatch = rawClean.match(/([0-9]+(?:\.[0-9]+)?)/);
        const numericValue = numMatch ? parseFloat(numMatch[1]) : undefined;
        // Detect unit
        const unitMatch = rawClean.match(/\b(cfm|kw|tr|cop|w\/sq\.ft|lps|gpm|%)\b/i);
        const unit = unitMatch ? unitMatch[1] : undefined;
        let mappedConcept = "UNRECOGNIZED";
        const headerLower = header.toLowerCase();
        if (/capacity|cooling|heating|tr\b|tonnage/i.test(headerLower)) {
            mappedConcept = "CAPACITY";
        }
        else if (/efficiency|cop\b|eer|seer|kw\/tr/i.test(headerLower)) {
            mappedConcept = "EFFICIENCY";
        }
        else if (/power|kw\b|watt|demand|electricity/i.test(headerLower)) {
            mappedConcept = "POWER";
        }
        else if (/flow|cfm|gpm|lps|air/i.test(headerLower)) {
            mappedConcept = "FLOW";
        }
        // Determine validity bounds
        let isValid = true;
        if (numericValue !== undefined) {
            if (mappedConcept === "EFFICIENCY" && (unit === null || unit === void 0 ? void 0 : unit.toLowerCase()) === "cop" && (numericValue < 2.0 || numericValue > 10.0)) {
                isValid = false; // COPs for standard sustainable buildings typically fall between 2.0 and 10.0
            }
            if (mappedConcept === "POWER" && numericValue < 0.0) {
                isValid = false; // Power cannot be negative
            }
        }
        return {
            cellValue: rawClean,
            mappedConcept,
            numericValue,
            unit,
            isValid,
        };
    }
}
exports.SemanticCellMapper = SemanticCellMapper;
