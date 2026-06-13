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
exports.tools = void 0;
exports.getToolRegistry = getToolRegistry;
exports.tools = {
    updateTaskStatus: { name: "updateTaskStatus", description: "Updates task status", execute: (args) => __awaiter(void 0, void 0, void 0, function* () { return ({ success: true, args }); }) },
    reassignCredit: { name: "reassignCredit", description: "Reassign credit", execute: (args) => __awaiter(void 0, void 0, void 0, function* () { return ({ success: true, args }); }) },
    getProjectHealth: { name: "getProjectHealth", description: "Get project health", execute: () => __awaiter(void 0, void 0, void 0, function* () { return ({ health: "GOOD" }); }) },
    getCreditReadiness: { name: "getCreditReadiness", description: "Get credit readiness", execute: () => __awaiter(void 0, void 0, void 0, function* () { return ({ readiness: 68 }); }) },
    getEvidenceReadiness: { name: "getEvidenceReadiness", description: "Get evidence readiness", execute: () => __awaiter(void 0, void 0, void 0, function* () { return ({ confidence: 62 }); }) },
    getCertificationProjection: { name: "getCertificationProjection", description: "Get certification projection", execute: () => __awaiter(void 0, void 0, void 0, function* () { return ({ rating: "Gold" }); }) },
    getAssignmentGraph: { name: "getAssignmentGraph", description: "Get assignment graph", execute: () => __awaiter(void 0, void 0, void 0, function* () { return ({ assignments: [] }); }) },
    getContributorWorkload: { name: "getContributorWorkload", description: "Get workload", execute: () => __awaiter(void 0, void 0, void 0, function* () { return ({ tasksCount: 5 }); }) },
    getProjectRisks: { name: "getProjectRisks", description: "Get project risks", execute: () => __awaiter(void 0, void 0, void 0, function* () { return ({ risks: [] }); }) },
    getProjectRecommendations: { name: "getProjectRecommendations", description: "Get recommendations", execute: () => __awaiter(void 0, void 0, void 0, function* () { return ({ recommendations: [] }); }) },
    getCrossProjectPatterns: { name: "getCrossProjectPatterns", description: "Get cross project patterns", execute: () => __awaiter(void 0, void 0, void 0, function* () { return ({ patterns: [] }); }) }
};
function getToolRegistry() {
    return Object.values(exports.tools);
}
