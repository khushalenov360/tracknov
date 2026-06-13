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
exports.PortfolioEvidenceEngine = void 0;
class PortfolioEvidenceEngine {
    static getEvidenceGaps(projectId, runtimeContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const gaps = [];
            const credits = runtimeContext.credits || [];
            const documents = runtimeContext.documents || [];
            for (const credit of credits) {
                if (credit.status === "APPROVED" || credit.na)
                    continue;
                const missingDocuments = [];
                const rejectedDocuments = [];
                const creditDocs = documents.filter((d) => d.doc_category === credit.credit_code);
                for (const doc of creditDocs) {
                    if (doc.state === "REJECTED") {
                        rejectedDocuments.push(doc.file_name || doc.id);
                    }
                }
                // Look at assignments to see what's missing
                const creditMap = runtimeContext.creditAssignmentGraph instanceof Map
                    ? runtimeContext.creditAssignmentGraph
                    : new Map(Object.entries(runtimeContext.creditAssignmentGraph || {}));
                const node = creditMap.get(credit.id);
                if (node && node.assignments) {
                    for (const assign of node.assignments) {
                        // If we have an assignment for a doc type, check if a document exists for it
                        // Simplified heuristic for missing documents:
                        const hasDoc = creditDocs.some((d) => { var _a; return d.doc_type === assign.doc_type || ((_a = d.file_name) === null || _a === void 0 ? void 0 : _a.includes(assign.doc_type)); });
                        if (!hasDoc) {
                            missingDocuments.push(assign.doc_type);
                        }
                    }
                }
                if (missingDocuments.length > 0 || rejectedDocuments.length > 0) {
                    // High readiness impact if there are rejections
                    const readinessImpact = rejectedDocuments.length > 0 ? 80 : 40;
                    gaps.push({
                        creditId: credit.id,
                        creditCode: credit.credit_code,
                        missingDocuments,
                        rejectedDocuments,
                        readinessImpact
                    });
                }
            }
            return gaps.sort((a, b) => b.readinessImpact - a.readinessImpact);
        });
    }
}
exports.PortfolioEvidenceEngine = PortfolioEvidenceEngine;
