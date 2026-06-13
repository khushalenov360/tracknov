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
exports.RecommendationEngine = void 0;
const missingEvidence_1 = require("./missingEvidence");
const nextAction_1 = require("./nextAction");
const evidenceReuse_1 = require("./evidenceReuse");
const readinessActions_1 = require("./readinessActions");
class RecommendationEngine {
    constructor(graph) {
        this.graph = graph;
        this.missingEvidence = new missingEvidence_1.MissingEvidenceRecommender(graph);
        this.nextAction = new nextAction_1.NextActionRecommender(graph);
        this.evidenceReuse = new evidenceReuse_1.EvidenceReuseRecommender(graph);
        this.readinessActions = new readinessActions_1.ReadinessActionsRecommender(graph);
    }
    getTopRecommendations(creditId) {
        return __awaiter(this, void 0, void 0, function* () {
            const missing = yield this.missingEvidence.generate(creditId);
            const reuse = yield this.evidenceReuse.generate(creditId);
            const next = yield this.nextAction.generate(creditId);
            // Combine and rank the top 5
            const combined = [...missing, ...reuse, ...next].sort((a, b) => (b.impact || 0) - (a.impact || 0));
            return combined.slice(0, 5);
        });
    }
}
exports.RecommendationEngine = RecommendationEngine;
