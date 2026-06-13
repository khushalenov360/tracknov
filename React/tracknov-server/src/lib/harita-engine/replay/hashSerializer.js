"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalSerialize = canonicalSerialize;
exports.computeSha256 = computeSha256;
exports.generateLineageHash = generateLineageHash;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Deterministic JSON stringifier to ensure stable field ordering
 * and reproducible hashes regardless of object key insertion order.
 */
function canonicalSerialize(obj) {
    if (obj === null || obj === undefined) {
        return "null";
    }
    if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        const serializedItems = obj.map((item) => canonicalSerialize(item)).join(",");
        return `[${serializedItems}]`;
    }
    if (typeof obj === "object") {
        // Stable field ordering by sorting keys
        const sortedKeys = Object.keys(obj).sort();
        const serializedPairs = sortedKeys.map((key) => {
            const val = obj[key];
            // Normalize timestamps if value is a Date object
            let normalizedVal = val;
            if (val instanceof Date) {
                normalizedVal = val.toISOString();
            }
            return `${JSON.stringify(key)}:${canonicalSerialize(normalizedVal)}`;
        }).join(",");
        return `{${serializedPairs}}`;
    }
    return "null";
}
/**
 * Computes SHA-256 hash of a serialized payload.
 */
function computeSha256(payload) {
    return crypto_1.default.createHash("sha256").update(payload, "utf8").digest("hex");
}
/**
 * Builds canonical lineage hash for Snapshot Schema v1.
 */
function generateLineageHash(payload) {
    const serialized = canonicalSerialize({
        certificationState: payload.certificationState,
        dependencyGraph: payload.dependencyGraph,
        derivedState: payload.derivedState,
        exportReferences: payload.exportReferences,
        replayContractVersion: payload.replayContractVersion,
        workflowLineage: payload.workflowLineage,
    });
    return computeSha256(serialized);
}
