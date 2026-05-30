import { SupplierTrustEngine, SupplierTrustMetric } from "./supplierTrustEngine";

export interface ReusableSupplierPack {
  supplierId: string;
  name: string;
  category: string;
  compatibleFrameworks: string[];
  reusableFiles: string[];
  approvalRating: number;
}

export class SupplierReuseAnalytics {
  private static mockSuppliers: SupplierTrustMetric[] = [
    {
      supplierId: "SUP-001",
      name: "Daikin Climate Systems",
      category: "HVAC Equipment",
      approvalsCount: 24,
      rejectionsCount: 1,
      averageClarificationLoops: 0.2,
      evidenceFreshnessDays: 45
    },
    {
      supplierId: "SUP-002",
      name: "Berger Eco Coatings",
      category: "Chemicals & Finishes",
      approvalsCount: 42,
      rejectionsCount: 3,
      averageClarificationLoops: 0.4,
      evidenceFreshnessDays: 90
    },
    {
      supplierId: "SUP-003",
      name: "Tata Structural Steel",
      category: "Structural Materials",
      approvalsCount: 18,
      rejectionsCount: 8,
      averageClarificationLoops: 1.8,
      evidenceFreshnessDays: 120
    }
  ];

  /**
   * Identifies highest trust suppliers matching selected green frameworks to limit audit friction
   */
  static getRecommendations(framework: string): ReusableSupplierPack[] {
    const list = this.mockSuppliers.map((sup) => {
      const scoring = SupplierTrustEngine.calculateTrustScore(sup);
      return {
        supplierId: sup.supplierId,
        name: sup.name,
        category: sup.category,
        compatibleFrameworks: ["LEED v4", "IGBC Green", "GRIHA v2019"],
        reusableFiles: [
          `${sup.name.replace(/\s+/g, "_")}_DataSheet.pdf`,
          `${sup.name.replace(/\s+/g, "_")}_ComplianceSummary.pdf`
        ],
        approvalRating: scoring.trustIndexScore
      };
    });

    // Rank from highest trust downwards
    return list.sort((a, b) => b.approvalRating - a.approvalRating);
  }
}
