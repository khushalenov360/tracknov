import crypto from "crypto";

/**
 * Deterministic JSON stringifier to ensure stable field ordering
 * and reproducible hashes regardless of object key insertion order.
 */
export function canonicalSerialize(obj: unknown): string {
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
    const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
    const serializedPairs = sortedKeys.map((key) => {
      const val = (obj as Record<string, unknown>)[key];
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
export function computeSha256(payload: string): string {
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Builds canonical lineage hash for Snapshot Schema v1.
 */
export function generateLineageHash(payload: {
  workflowLineage: unknown;
  certificationState: unknown;
  derivedState: unknown;
  dependencyGraph: unknown;
  exportReferences: unknown;
  replayContractVersion: string;
}): string {
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
