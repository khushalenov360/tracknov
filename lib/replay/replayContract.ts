export interface ReplayContract {
  replayBoundary: "snapshot_authoritative";
  eventOrderingMode: "transaction_sequence";
  derivedStateMode: "deterministic_recompute";
  sideEffectMode: "disabled";
  crossProjectVisibility: false;
  replayIsolationMode: "strict";
  authorizationMode: "pre_validation";
  replayVersion: string;
}

export const CURRENT_REPLAY_CONTRACT: ReplayContract = {
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
export function validateReplayContractSemantics(contract: Partial<ReplayContract>): boolean {
  return (
    contract.replayBoundary === "snapshot_authoritative" &&
    contract.eventOrderingMode === "transaction_sequence" &&
    contract.derivedStateMode === "deterministic_recompute" &&
    contract.sideEffectMode === "disabled" &&
    contract.crossProjectVisibility === false &&
    contract.replayIsolationMode === "strict" &&
    contract.authorizationMode === "pre_validation"
  );
}
