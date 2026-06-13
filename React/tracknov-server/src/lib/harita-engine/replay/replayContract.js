"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENT_REPLAY_CONTRACT = void 0;
exports.validateReplayContractSemantics = validateReplayContractSemantics;
exports.CURRENT_REPLAY_CONTRACT = {
    authorizationMode: "pre_validation",
    crossProjectVisibility: false,
    derivedStateMode: "deterministic_recompute",
    eventOrderingMode: "transaction_sequence",
    replayBoundary: "snapshot_authoritative",
    replayIsolationMode: "strict",
    replayVersion: "v1.0-deterministic",
    sideEffectMode: "disabled",
};
/**
 * Asserts adherence to the immutable Replay Contract execution semantics.
 */
function validateReplayContractSemantics(contract) {
    return (contract.replayBoundary === "snapshot_authoritative" &&
        contract.eventOrderingMode === "transaction_sequence" &&
        contract.derivedStateMode === "deterministic_recompute" &&
        contract.sideEffectMode === "disabled" &&
        contract.crossProjectVisibility === false &&
        contract.replayIsolationMode === "strict" &&
        contract.authorizationMode === "pre_validation");
}
