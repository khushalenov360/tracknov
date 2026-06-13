"use strict";
// packages/harita-engine/src/document-intelligence/DocumentClassifier.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentClassifier = void 0;
const DocumentNormalizer_1 = require("./DocumentNormalizer");
class DocumentClassifier {
    constructor() {
        this.normalizer = new DocumentNormalizer_1.DocumentNormalizer();
    }
    /**
     * Identifies the primary evidence type based on keywords in the text.
     * This is a deterministic regex-based classifier.
     */
    classifyText(rawText, filename) {
        const normalized = this.normalizer.normalizeText(rawText);
        const matchable = this.normalizer.generateMatchableText(normalized);
        const lowerFilename = filename.toLowerCase();
        // Prioritize Area Statement
        if (matchable.includes("area statement") || lowerFilename.includes("area statement") || lowerFilename.includes("area_statement")) {
            return "AREA_STATEMENT";
        }
        // Energy Model
        if (matchable.includes("energy model") || matchable.includes("simulation report") || lowerFilename.includes("energy model")) {
            return "ENERGY_MODEL";
        }
        // Water Calculation
        if (matchable.includes("water calculation") || matchable.includes("water balance") || lowerFilename.includes("water calc")) {
            return "WATER_CALCULATION";
        }
        // Drawing
        if (matchable.includes("drawing") ||
            matchable.includes("floor plan") ||
            matchable.includes("layout") ||
            matchable.includes("section") ||
            matchable.includes("elevation") ||
            lowerFilename.includes("drawing") ||
            lowerFilename.includes("layout") ||
            lowerFilename.includes("plan")) {
            return "DRAWING";
        }
        // Calculation
        if (matchable.includes("calculation") || matchable.includes("formula") || lowerFilename.includes("calc")) {
            return "CALCULATION";
        }
        // Invoice
        if (matchable.includes("invoice") || matchable.includes("bill of quantity") || matchable.includes("boq") || lowerFilename.includes("invoice")) {
            return "INVOICE";
        }
        // Specification
        if (matchable.includes("specification") || matchable.includes("datasheet") || matchable.includes("data sheet") || lowerFilename.includes("spec")) {
            return "SPECIFICATION";
        }
        // Narrative
        if (matchable.includes("narrative") || matchable.includes("description") || matchable.includes("project report") || lowerFilename.includes("narrative") || lowerFilename.includes("report")) {
            return "NARRATIVE";
        }
        // Photo (Often just by filename extension, but adding keywords)
        if (matchable.includes("site photo") || matchable.includes("photograph") || lowerFilename.endsWith(".png") || lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg")) {
            return "PHOTO";
        }
        return "UNKNOWN";
    }
}
exports.DocumentClassifier = DocumentClassifier;
