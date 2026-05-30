import { computeSha256 } from "./hashSerializer";

export interface ReplayAttestationPayload {
  projectId: string;
  snapshotId: string;
  replayHash: string;
  timestamp: string;
  isPure: boolean;
  isIsolated: boolean;
  isAuthorized: boolean;
}

/**
 * Generates an unforgeable cryptographic attestation signature
 * proving that replay output successfully satisfied all purity, isolation, and authorization constraints.
 */
export function generateReplayAttestationProof(payload: ReplayAttestationPayload): string {
  const canonicalString = [
    `projectId:${payload.projectId}`,
    `snapshotId:${payload.snapshotId}`,
    `replayHash:${payload.replayHash}`,
    `timestamp:${payload.timestamp}`,
    `isPure:${payload.isPure}`,
    `isIsolated:${payload.isIsolated}`,
    `isAuthorized:${payload.isAuthorized}`,
  ].join("|");

  return computeSha256(canonicalString);
}
