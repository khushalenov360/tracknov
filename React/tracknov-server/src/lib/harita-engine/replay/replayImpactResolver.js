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
exports.resolveReplayImpact = resolveReplayImpact;
const admin_1 = require("@/lib/supabase/admin");
const governanceObservabilityBus_1 = require("../governance/governanceObservabilityBus");
/**
 * Resolves the impact of evidence changes on downstream derived states and certifications.
 */
function resolveReplayImpact(projectId, changedEntityId, entityType) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        const invalidated = [];
        let certImpacted = false;
        // 1. Invalidate Derived State (Marks for recalculation)
        const { error: recalcError } = yield admin
            .from("recalculation_queue")
            .insert({
            project_id: projectId,
            entity_type: entityType,
            entity_id: changedEntityId,
            status: "PENDING",
            reason: "REPLAY_SENSITIVE_CHANGE"
        });
        if (recalcError) {
            console.error("Failed to queue recalculation:", recalcError);
        }
        // 2. Check for Certification Impact
        const { data: project } = yield admin
            .from("projects")
            .select("status")
            .eq("id", projectId)
            .single();
        if ((project === null || project === void 0 ? void 0 : project.status) === "CERTIFIED" || (project === null || project === void 0 ? void 0 : project.status) === "LOCKED") {
            certImpacted = true;
            invalidated.push(`CERTIFICATION_${projectId}`);
            // Log critical governance event
            yield (0, governanceObservabilityBus_1.emitGovernanceEvent)({
                category: "CERTIFICATION_INVALIDATION",
                severity: "critical",
                sourceLayer: "replayImpactResolver",
                projectId,
                payload: { changedEntityId, entityType }
            });
        }
        // 3. Invalidate downstream approvals (Logic would be more complex in production)
        // Placeholder: find submittals dependent on this evidence
        invalidated.push(`DERIVED_STATE_${changedEntityId}`);
        return {
            invalidatedEntities: invalidated,
            reconciliationTasksGenerated: 1, // At least the recalculation queue entry
            certificationImpacted: certImpacted,
        };
    });
}
