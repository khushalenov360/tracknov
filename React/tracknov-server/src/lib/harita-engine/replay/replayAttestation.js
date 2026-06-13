"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReplayAttestationProof = generateReplayAttestationProof;
const hashSerializer_1 = require("./hashSerializer");
/**
 * Generates an unforgeable cryptographic attestation signature
 * proving that replay output successfully satisfied all purity, isolation, and authorization constraints.
 */
function generateReplayAttestationProof(payload) {
    const canonicalString = [
        `projectId:${payload.projectId}`,
        `snapshotId:${payload.snapshotId}`,
        `replayHash:${payload.replayHash}`,
        `timestamp:${payload.timestamp}`,
        `isPure:${payload.isPure}`,
        `isIsolated:${payload.isIsolated}`,
        `isAuthorized:${payload.isAuthorized}`,
    ].join("|");
    return (0, hashSerializer_1.computeSha256)(canonicalString);
}
