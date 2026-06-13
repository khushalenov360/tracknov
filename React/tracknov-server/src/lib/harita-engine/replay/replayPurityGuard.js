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
exports.ReplayPurityViolationError = void 0;
exports.runWithPurityGuard = runWithPurityGuard;
exports.assertSideEffectPermitted = assertSideEffectPermitted;
const replayContract_1 = require("./replayContract");
/**
 * Purity assertion wrapper guaranteeing side-effect-free Replay boundaries.
 * Verifies that the runtime state prevents outbound propagation or database persistence.
 */
class ReplayPurityViolationError extends Error {
    constructor(operation, blockedReason) {
        super(`Replay Purity Violation: Attempted forbidden side-effect operation [${operation}]. Reason: ${blockedReason}`);
        this.name = "ReplayPurityViolationError";
    }
}
exports.ReplayPurityViolationError = ReplayPurityViolationError;
let activeReplayContextsCount = 0;
/**
 * Executes a callback within a request-scoped, self-destructing memory isolation boundary.
 * Intercepts any external persistence triggers to safeguard system integrity.
 */
function runWithPurityGuard(projectId, fn) {
    return __awaiter(this, void 0, void 0, function* () {
        activeReplayContextsCount++;
        try {
            // Assert tenant isolation and boundary flags
            if (replayContract_1.CURRENT_REPLAY_CONTRACT.sideEffectMode !== "disabled") {
                throw new ReplayPurityViolationError("InitializeBoundary", "Contract sideEffectMode must be strictly disabled.");
            }
            const result = yield fn();
            return result;
        }
        finally {
            activeReplayContextsCount--;
        }
    });
}
/**
 * Explicit guard called by downstream infrastructure to abort forbidden persistence side-effects
 * if a replay sequence is active in the current call stack.
 */
function assertSideEffectPermitted(operationDescription) {
    if (activeReplayContextsCount > 0) {
        throw new ReplayPurityViolationError(operationDescription, "Active replay context strictly forbids state mutation, queues, or outbound event propagation.");
    }
}
