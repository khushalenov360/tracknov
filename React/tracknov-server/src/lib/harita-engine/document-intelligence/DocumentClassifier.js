"use strict";
// packages/harita-engine/src/document-intelligence/DocumentClassifier.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentClassifier = void 0;
const DocumentNormalizer_1 = require("./DocumentNormalizer");
class DocumentClassifier {
    constructor() {
        this.normalizer = new DocumentNormalizer_1.DocumentNormalizer();
        this.classifierSignals = [
            {
                type: "AREA_STATEMENT",
                textSignals: ["area statement", "built up area", "carpet area", "plot area", "site area"],
                filenameSignals: ["area statement", "area_statement"],
            },
            {
                type: "ENERGY_MODEL",
                textSignals: ["energy model", "simulation report", "energy simulation", "ecbc model", "cooling load"],
                filenameSignals: ["energy model", "simulation"],
            },
            {
                type: "WATER_CALCULATION",
                textSignals: [
                    "water calculation",
                    "water balance",
                    "water consumption",
                    "plumbing",
                    "sanitary",
                    "fixture",
                    "faucet",
                    "urinal",
                    "water closet",
                    "flush rate",
                    "flow rate",
                    "lpm",
                    "gpm",
                ],
                filenameSignals: ["water calc", "plumbing", "sanitary", "fixture", "water"],
            },
            {
                type: "DRAWING",
                textSignals: ["drawing", "floor plan", "layout", "section", "elevation", "ga drawing"],
                filenameSignals: ["drawing", "layout", "plan", "elevation", "section"],
            },
            {
                type: "CALCULATION",
                textSignals: ["calculation", "formula", "schedule", "tabulation", "load summary"],
                filenameSignals: ["calc", "calculation", "schedule"],
            },
            {
                type: "INVOICE",
                textSignals: ["invoice", "bill of quantity", "boq", "purchase order", "receipt"],
                filenameSignals: ["invoice", "boq", "receipt", "po"],
            },
            {
                type: "SPECIFICATION",
                textSignals: ["specification", "datasheet", "data sheet", "technical data", "product data"],
                filenameSignals: ["spec", "datasheet", "data sheet", "technical"],
            },
            {
                type: "NARRATIVE",
                textSignals: ["narrative", "description", "project report", "method statement", "approach note"],
                filenameSignals: ["narrative", "report", "method", "description"],
            },
        ];
    }
    /**
     * Identifies the primary evidence type based on keywords in the text.
     * This is a deterministic regex-based classifier.
     */
    classifyText(rawText, filename) {
        const normalized = this.normalizer.normalizeText(rawText);
        const matchable = this.normalizer.generateMatchableText(normalized);
        const lowerFilename = filename.toLowerCase();
        for (const signalGroup of this.classifierSignals) {
            const textMatch = signalGroup.textSignals.some((signal) => matchable.includes(signal));
            const filenameMatch = signalGroup.filenameSignals.some((signal) => lowerFilename.includes(signal));
            if (textMatch || filenameMatch) {
                return signalGroup.type;
            }
        }
        // Photo (Often just by filename extension, but adding keywords)
        if (matchable.includes("site photo") || matchable.includes("photograph") || lowerFilename.endsWith(".png") || lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg")) {
            return "PHOTO";
        }
        return "UNKNOWN";
    }
}
exports.DocumentClassifier = DocumentClassifier;
