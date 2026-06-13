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
exports.contextIsolationEngine = exports.ContextIsolationEngine = exports.ArtifactState = void 0;
const harita_runtime_service_1 = require("../services/harita-runtime-service");
var ArtifactState;
(function (ArtifactState) {
    ArtifactState["ACTIVE"] = "ACTIVE";
    ArtifactState["DISCARDED"] = "DISCARDED";
    ArtifactState["MAPPED"] = "MAPPED";
    ArtifactState["UNMAPPED"] = "UNMAPPED";
    ArtifactState["ARCHIVED"] = "ARCHIVED";
})(ArtifactState || (exports.ArtifactState = ArtifactState = {}));
class ContextIsolationEngine {
    setArtifactState(userId, projectId, artifactId, state) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield harita_runtime_service_1.haritaRuntimeService.getOrCreateSession(userId, projectId);
            yield harita_runtime_service_1.haritaRuntimeService.storeSemanticMemory(session.id, 'artifact_state', artifactId, { status: state });
        });
    }
    getDiscardedArtifactIds(userId, projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const session = yield harita_runtime_service_1.haritaRuntimeService.getOrCreateSession(userId, projectId);
            const memories = yield harita_runtime_service_1.haritaRuntimeService.getSessionMemoryRaw(session.id);
            const discarded = new Set();
            for (const mem of memories) {
                if (mem.memory_type === 'artifact_state' && ((_a = mem.memory_value) === null || _a === void 0 ? void 0 : _a.status) === ArtifactState.DISCARDED) {
                    discarded.add(mem.memory_key);
                }
            }
            return discarded;
        });
    }
    filterActiveEvidence(evidence, discardedIds) {
        return evidence.filter(e => {
            if (e.id && discardedIds.has(e.id)) {
                return false;
            }
            if (e.status === ArtifactState.DISCARDED || e.status === "DISCARDED" || e.status === "DELETED") {
                return false;
            }
            // Only permit known active states
            return e.status === ArtifactState.ACTIVE || e.status === "READY" || e.status === "uploaded" || e.status === "MAPPED";
        });
    }
}
exports.ContextIsolationEngine = ContextIsolationEngine;
exports.contextIsolationEngine = new ContextIsolationEngine();
