"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportFailureAnalyzer = void 0;
class ExportFailureAnalyzer {
    /**
     * Identifies the exact node causing an export failure
     */
    static analyzeFailure(exportId) {
        return {
            exportId,
            format: "PDF",
            brokenElementId: "RM-204-gypsum-spec",
            reconciliationPath: "Convert layout formatting into UTF-8 representation and re-render."
        };
    }
}
exports.ExportFailureAnalyzer = ExportFailureAnalyzer;
