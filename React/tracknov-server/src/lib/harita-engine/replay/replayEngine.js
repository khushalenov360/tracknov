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
exports.executeDeterministicReplay = executeDeterministicReplay;
const admin_1 = require("@/lib/supabase/admin");
const replayContract_1 = require("./replayContract");
/**
 * Mathematically deterministic Replay Engine orchestration layer.
 * Calls execute_audit_replay to retrieve the exact point-in-time database snapshot.
 * Ensures strict runtime isolation, ensuring absolutely no queues/websockets/mutations are emitted.
 */
function executeDeterministicReplay(projectId, targetTimestamp) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        // Execute point-in-time pure database reconstruction using the secure, deterministic stored procedure
        const { data, error } = yield admin.rpc("execute_audit_replay", {
            p_project_id: projectId,
            p_target_timestamp: targetTimestamp,
        });
        if (error || !data) {
            throw new Error(`Deterministic replay reconstruction failed: ${(error === null || error === void 0 ? void 0 : error.message) || "Empty return from engine"}`);
        }
        // If the stored procedure captured a tenant isolation violation or error, bubble it up securely
        if (data.error) {
            throw new Error(`Replay Access Denied: ${data.message || data.error}`);
        }
        return {
            contract: replayContract_1.CURRENT_REPLAY_CONTRACT,
            executedAt: new Date().toISOString(),
            isSideEffectFree: true,
            reconstructedState: {
                integrityValidation: data.integrity_validation || {},
                metadata: data.metadata || {},
                tables: data.tables || {},
            },
        };
    });
}
