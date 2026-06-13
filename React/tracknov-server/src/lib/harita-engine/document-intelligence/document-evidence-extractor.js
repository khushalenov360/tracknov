"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentEvidenceExtractor = void 0;
class DocumentEvidenceExtractor {
    /**
     * Extracts granular evidence (metrics, claims, tables) from raw document text.
     * This is a stub implementation that would ideally be powered by an LLM call
     * specific to evidence extraction using libraries like pdf-parse, xlsx, etc.
     */
    static extractEvidence(documentName, documentType, rawContent) {
        return __awaiter(this, void 0, void 0, function* () {
            const metrics = {};
            const claims = [];
            const tables = [];
            const formulas = [];
            // Basic heuristic-based extraction for demonstration.
            // In production, this would use a structured LLM prompt:
            // "Extract Carpet Area, Circulation Area, Percentages, and Formulas from this text."
            const carpetAreaMatch = rawContent.match(/carpet area\s*(?:is|=|:)?\s*([\d.,]+)\s*(?:sqm|sq ft)/i);
            if (carpetAreaMatch) {
                metrics['Carpet Area'] = `${carpetAreaMatch[1]} sqm`;
            }
            const circAreaMatch = rawContent.match(/circulation area\s*(?:is|=|:)?\s*([\d.,]+)\s*(?:sqm|sq ft)/i);
            if (circAreaMatch) {
                metrics['Circulation Area'] = `${circAreaMatch[1]} sqm`;
            }
            const circPctMatch = rawContent.match(/circulation percentage\s*(?:is|=|:)?\s*([\d.,]+)\s*%/i);
            if (circPctMatch) {
                metrics['Circulation Percentage'] = `${circPctMatch[1]}%`;
            }
            // Extracting basic claims
            if (rawContent.toLowerCase().includes("certified green product")) {
                claims.push("Contains certified green product claim.");
            }
            // Example of capturing formulas if it's an Excel dump
            if (documentType.includes('excel') || documentType.includes('spreadsheet')) {
                const formulaMatches = rawContent.match(/=SUM\(.*?\)|=AVERAGE\(.*?\)/gi);
                if (formulaMatches) {
                    formulas.push(...formulaMatches);
                }
            }
            return {
                sourceDocument: documentName,
                metrics,
                claims,
                tables,
                formulas
            };
        });
    }
    static formatForContext(evidence) {
        const parts = [`--- Extracted from ${evidence.sourceDocument} ---`];
        if (Object.keys(evidence.metrics).length > 0) {
            parts.push(`Metrics:\n` + Object.entries(evidence.metrics).map(([k, v]) => `- ${k} = ${v}`).join('\n'));
        }
        if (evidence.claims.length > 0) {
            parts.push(`Claims:\n` + evidence.claims.map(c => `- ${c}`).join('\n'));
        }
        if (evidence.formulas.length > 0) {
            parts.push(`Formulas Detected: ${evidence.formulas.join(', ')}`);
        }
        if (parts.length === 1) {
            parts.push("No specific granular evidence extracted.");
        }
        return parts.join('\n\n');
    }
}
exports.DocumentEvidenceExtractor = DocumentEvidenceExtractor;
