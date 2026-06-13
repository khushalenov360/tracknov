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
exports.EvidenceReuseRecommender = void 0;
const evidenceGraph_1 = require("../../intelligence-certification/graph/evidenceGraph");
class EvidenceReuseRecommender {
    constructor(graph) {
        this.graph = graph;
    }
    generate(creditId) {
        return __awaiter(this, void 0, void 0, function* () {
            const reusable = (0, evidenceGraph_1.findReusableEvidence)(this.graph, creditId);
            return reusable.map((node) => ({
                type: 'reuse',
                evidence: node.data.title || 'Document',
                reason: 'Matches submittal criteria based on document category',
                impact: 5,
                confidence: 80
            }));
        });
    }
}
exports.EvidenceReuseRecommender = EvidenceReuseRecommender;
