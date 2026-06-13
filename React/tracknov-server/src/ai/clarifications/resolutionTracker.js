"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResolutionTracker = void 0;
class ResolutionTracker {
    track(clarificationId, actions) {
        return {
            clarificationId,
            status: 'PLAN_GENERATED',
            pendingActions: actions,
            completedActions: []
        };
    }
}
exports.ResolutionTracker = ResolutionTracker;
