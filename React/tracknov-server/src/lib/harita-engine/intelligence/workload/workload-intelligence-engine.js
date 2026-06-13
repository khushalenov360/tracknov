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
exports.WorkloadIntelligenceEngine = void 0;
class WorkloadIntelligenceEngine {
    static getContributorWorkloads(projectId, runtimeContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const workloads = new Map();
            const profiles = runtimeContext.profiles || {};
            const creditMap = runtimeContext.creditAssignmentGraph instanceof Map
                ? runtimeContext.creditAssignmentGraph
                : new Map(Object.entries(runtimeContext.creditAssignmentGraph || {}));
            // Initialize workloads for all known profiles
            for (const [uid, p] of Object.entries(profiles)) {
                const profile = p;
                workloads.set(uid, {
                    contributorId: uid,
                    contributorName: profile.full_name || profile.role || uid,
                    activeAssignments: 0,
                    overdueAssignments: 0,
                    blockedAssignments: 0,
                    workloadScore: 0,
                    capacityUtilization: 0,
                    predictedOverload: false,
                    reassignmentCandidates: []
                });
            }
            // Traverse assignments
            for (const [creditId, node] of creditMap.entries()) {
                const assignments = node.assignments || [];
                const credit = (runtimeContext.credits || []).find((c) => c.id === creditId);
                if (credit && credit.na)
                    continue;
                const isBlocked = credit && credit.status === "BLOCKED";
                for (const assignment of assignments) {
                    const uid = assignment.assigned_to;
                    if (!uid)
                        continue;
                    let wl = workloads.get(uid);
                    if (!wl) {
                        wl = {
                            contributorId: uid,
                            contributorName: uid,
                            activeAssignments: 0,
                            overdueAssignments: 0,
                            blockedAssignments: 0,
                            workloadScore: 0,
                            capacityUtilization: 0,
                            predictedOverload: false,
                            reassignmentCandidates: []
                        };
                        workloads.set(uid, wl);
                    }
                    wl.activeAssignments++;
                    if (isBlocked) {
                        wl.blockedAssignments++;
                    }
                }
            }
            const results = Array.from(workloads.values());
            for (const r of results) {
                r.workloadScore = r.activeAssignments + (r.overdueAssignments * 3) + (r.blockedAssignments * 2);
                // Simple predictive logic: capacity is roughly based on score > 5
                r.capacityUtilization = Math.min(100, Math.max(0, Math.round((r.workloadScore / 6) * 100)));
                r.predictedOverload = r.capacityUtilization >= 85;
                // Reassignment candidates: those with capacity utilization < 50%
                if (r.predictedOverload) {
                    r.reassignmentCandidates = results
                        .filter(c => c.contributorId !== r.contributorId && c.workloadScore < 3)
                        .map(c => c.contributorName);
                }
            }
            // Sort highest workload to lowest
            return results.sort((a, b) => b.workloadScore - a.workloadScore);
        });
    }
}
exports.WorkloadIntelligenceEngine = WorkloadIntelligenceEngine;
