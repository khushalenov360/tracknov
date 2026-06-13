"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.workflowOrchestratorService = exports.WorkflowOrchestratorService = void 0;
const admin_1 = require("@/lib/supabase/admin");
const server_1 = require("@/lib/supabase/server");
const env_1 = require("@/lib/env");
const rbac_1 = require("@/lib/rbac");
const runtime_governance_service_1 = require("@/lib/harita-engine/services/runtime-governance-service");
const state_renderer_1 = require("@/lib/core/workflow/state-renderer");
const machines_1 = require("@/lib/core/workflow/machines");
class WorkflowOrchestratorService {
    get reader() {
        return (0, server_1.createClient)();
    }
    get writer() {
        return env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : this.reader;
    }
    failure(status, message, lockState = { locked: false, reason: null }, allowedActions = []) {
        return {
            ok: false,
            status,
            message,
            allowed_actions: allowedActions,
            lock_state: lockState,
        };
    }
    getProjectRole(projectId, user) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (user.role === "L5" || user.role === "super_user")
                return "L5";
            const { data } = yield this.reader
                .from("project_users")
                .select("role")
                .eq("project_id", projectId)
                .eq("user_id", user.id)
                .limit(1)
                .maybeSingle();
            return (_b = (_a = data === null || data === void 0 ? void 0 : data.role) !== null && _a !== void 0 ? _a : user.role) !== null && _b !== void 0 ? _b : null;
        });
    }
    getProjectLockState(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { data } = yield this.reader
                .from("projects")
                .select("certification_state, certification_block_reason")
                .eq("id", projectId)
                .maybeSingle();
            const certificationState = String((_a = data === null || data === void 0 ? void 0 : data.certification_state) !== null && _a !== void 0 ? _a : "");
            const locked = certificationState === "CERTIFIED_LOCKED";
            return {
                locked,
                reason: locked
                    ? ((_b = data === null || data === void 0 ? void 0 : data.certification_block_reason) !== null && _b !== void 0 ? _b : "Project is certified and locked.")
                    : null,
            };
        });
    }
    logSecurityEvent(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                yield this.writer.from("security_events").insert({
                    project_id: (_a = params.projectId) !== null && _a !== void 0 ? _a : null,
                    actor_id: (_b = params.userId) !== null && _b !== void 0 ? _b : null,
                    event_type: params.eventType,
                    severity: (_c = params.severity) !== null && _c !== void 0 ? _c : "warning",
                    details: (_d = params.details) !== null && _d !== void 0 ? _d : {},
                });
            }
            catch (_e) {
                // Silent fail
            }
        });
    }
    setRuntimeContext(role, userId, override) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.writer.rpc("set_runtime_context", {
                p_user_role: role,
                p_user_id: userId,
                p_override: override,
            });
        });
    }
    transition(user, request) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            const started = Date.now();
            if (!user) {
                return this.failure("authentication_failed", "Authentication required.");
            }
            // Resolve Project Context
            let projectId = request.projectId;
            let currentState = "DRAFT";
            if (request.entityType === "document" || request.entityType === "submittal") {
                const table = request.entityType === "document" ? "project_document" : "submittals";
                const stateCol = request.entityType === "document" ? "workflow_state" : "state";
                const { data } = yield this.reader
                    .from(table)
                    .select(`id, project_id, ${stateCol}`)
                    .eq("id", request.entityId)
                    .maybeSingle();
                if (!data)
                    return this.failure("not_found", "Entity not found.");
                projectId = projectId !== null && projectId !== void 0 ? projectId : data.project_id;
                currentState = (_a = data[stateCol]) !== null && _a !== void 0 ? _a : "DRAFT";
            }
            else if (request.entityType === "project") {
                const { data } = yield this.reader
                    .from("projects")
                    .select("id, certification_state")
                    .eq("id", request.entityId)
                    .maybeSingle();
                if (!data)
                    return this.failure("not_found", "Project not found.");
                projectId = data.id;
                currentState = (_b = data.certification_state) !== null && _b !== void 0 ? _b : "NOT_STARTED";
            }
            if (!projectId) {
                return this.failure("invalid_payload", "Project context could not be resolved.");
            }
            const lockState = yield this.getProjectLockState(projectId);
            const actorRole = yield this.getProjectRole(projectId, user);
            if (!actorRole) {
                yield this.logSecurityEvent({
                    projectId,
                    userId: user.id,
                    eventType: "workflow_membership_denied",
                    details: { entityId: request.entityId },
                });
                return this.failure("authorization_failed", "Project membership is required.", lockState);
            }
            const override = Boolean(request.override);
            if (lockState.locked && !(override && (0, rbac_1.isL5Role)(actorRole))) {
                return this.failure("lock_violation", (_c = lockState.reason) !== null && _c !== void 0 ? _c : "Project is locked.", lockState);
            }
            // Validate using State Machines
            try {
                const workflowRole = (0, machines_1.mapTracknovRoleToWorkflowRole)(actorRole);
                if (request.entityType === "document" || request.entityType === "submittal") {
                    const machine = new machines_1.SubmittalWorkflowMachine();
                    machine.validate(currentState, request.targetState, workflowRole);
                }
                else if (request.entityType === "project") {
                    const machine = new machines_1.ProjectCertificationMachine();
                    machine.validate(currentState, request.targetState, workflowRole);
                }
            }
            catch (err) {
                return this.failure("workflow_failed", err.message, lockState);
            }
            // RBAC Engine Check (Section 25)
            // Mapping target state to logical actions for canUser
            let action = "UPLOAD";
            if (["APPROVED", "REJECTED", "CLARIFICATION"].includes(request.targetState)) {
                action = "APPROVE";
            }
            if (!(0, rbac_1.canUser)(actorRole, action, request.entityType.toUpperCase())) {
                return this.failure("authorization_failed", `Role ${actorRole} is not authorized for this action.`, lockState);
            }
            // Execute Governed Transition via RPC
            yield this.setRuntimeContext(actorRole, user.id, override);
            const idempotencyKey = (_d = request.idempotencyKey) !== null && _d !== void 0 ? _d : `${request.entityType}-${request.entityId}-${request.targetState}-${Date.now()}`;
            const { data: rpcData, error: rpcError } = yield this.writer.rpc("execute_governed_transition", {
                p_entity_type: request.entityType,
                p_entity_id: request.entityId,
                p_target_state: request.targetState,
                p_actor_id: user.id,
                p_actor_role: actorRole,
                p_reason: (_e = request.reason) !== null && _e !== void 0 ? _e : `Transition to ${request.targetState}`,
                p_idempotency_key: idempotencyKey,
                p_metadata: Object.assign(Object.assign({}, request.metadata), { override, overrideReason: request.overrideReason }),
            });
            if (rpcError) {
                return this.failure("workflow_failed", rpcError.message, lockState);
            }
            const transition = (rpcData !== null && rpcData !== void 0 ? rpcData : {});
            if (!transition.success) {
                return this.failure("workflow_failed", "Transition execution failed in database.", lockState);
            }
            // Post-Transition Logic (Section 9: Derived State)
            if (request.entityType === "submittal") {
                const { submittalService } = yield Promise.resolve().then(() => __importStar(require("./submittal-service")));
                yield submittalService.recalculateSubmittalState(request.entityId, this.writer);
            }
            const toState = ((_f = transition.to) !== null && _f !== void 0 ? _f : request.targetState);
            yield runtime_governance_service_1.runtimeGovernanceService.recordMetric({
                projectId,
                metricName: "orchestrator_transition_latency_ms",
                metricValue: Date.now() - started,
                ok: true,
                details: { entityType: request.entityType, entityId: request.entityId, targetState: toState },
            });
            return {
                ok: true,
                workflow_state: toState,
                allowed_actions: (0, state_renderer_1.workflowAllowedActions)(toState),
                lock_state: lockState,
                validation_status: "passed",
                audit_reference: idempotencyKey,
                derived_state_summary: {
                    project_id: projectId,
                    entity_type: request.entityType,
                    entity_id: request.entityId,
                    from_state: (_g = transition.from) !== null && _g !== void 0 ? _g : currentState,
                    to_state: toState,
                },
            };
        });
    }
    transitionSubmittal(user, args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.transition(user, {
                entityType: "submittal",
                entityId: args.submittalId,
                projectId: args.projectId,
                targetState: args.targetState,
                reason: args.reason,
                override: args.override
            });
        });
    }
    // Simplified Assignment (L1/L3 only)
    assignContributor(user, request) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!user)
                return { ok: false, message: "Auth required" };
            const actorRole = yield this.getProjectRole(request.projectId, user);
            if (!(0, rbac_1.canUser)(actorRole, "MANAGE_TEAM", "TEAM")) {
                return { ok: false, message: "Unauthorized" };
            }
            // Check if assignments are locked for the project
            const { data: project } = yield this.reader
                .from("projects")
                .select("assignments_locked")
                .eq("id", request.projectId)
                .maybeSingle();
            if (project === null || project === void 0 ? void 0 : project.assignments_locked) {
                return { ok: false, message: "Assignments are locked for this project." };
            }
            const { creditService } = yield Promise.resolve().then(() => __importStar(require("./credit-service")));
            const { runInOperationalMode } = yield Promise.resolve().then(() => __importStar(require("../governance/governanceMutationInterceptor")));
            return runInOperationalMode(request.projectId, () => __awaiter(this, void 0, void 0, function* () {
                yield creditService.assignContributor(user, request, this.writer);
                return { ok: true };
            }), user.id);
        });
    }
}
exports.WorkflowOrchestratorService = WorkflowOrchestratorService;
exports.workflowOrchestratorService = new WorkflowOrchestratorService();
