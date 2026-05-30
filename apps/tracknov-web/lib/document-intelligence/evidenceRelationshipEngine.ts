/**
 * Tracknov Document Intelligence - Evidence Relationship Engine
 * Map connections between evidence documents, submittal credits, and audit approval chains.
 */

import { EvidenceRelationship } from "../types";

export class EvidenceRelationshipEngine {
  /**
   * Deterministically infers relationship links between evidence and green building credits.
   */
  public static inferRelationships(
    documentId: string,
    extractedText: string,
    frameworkVersion: string
  ): EvidenceRelationship[] {
    const relationships: EvidenceRelationship[] = [];
    const textLower = extractedText.toLowerCase();

    // Mapping rules based on green building terminology
    const mappingRules = [
      { tag: "HVAC", category: "ENERGY_EFFICIENCY", relType: "EVIDENCE_FOR_CREDIT", target: "credit-ee-01", confidence: 0.90 },
      { tag: "lighting", category: "ENERGY_EFFICIENCY", relType: "EVIDENCE_FOR_CREDIT", target: "credit-ee-02", confidence: 0.88 },
      { tag: "concrete", category: "SUSTAINABLE_MATERIALS", relType: "MATERIAL_COMPLIANCE", target: "credit-mr-01", confidence: 0.85 },
      { tag: "flow", category: "WATER_CONSERVATION", relType: "FLOW_RATE_COMPLIANCE", target: "credit-we-01", confidence: 0.92 },
      { tag: "fresh air", category: "INDOOR_ENVIRONMENTAL_QUALITY", relType: "VENTILATION_COMPLIANCE", target: "credit-ieq-01", confidence: 0.89 },
    ];

    for (const rule of mappingRules) {
      if (textLower.includes(rule.tag.toLowerCase())) {
        relationships.push({
          sourceDocumentId: documentId,
          targetEntityId: rule.target,
          relationshipType: rule.relType,
          confidenceScore: rule.confidence,
          frameworkVersion,
        });
      }
    }

    return relationships;
  }
}
