export interface MarketplaceEvidencePack {
  packId: string;
  supplierName: string;
  materialType: string;
  ratingStandard: string; // IGBC, LEED
  downloadsCount: number;
}

export class SupplierEvidenceMarketplace {
  /**
   * Retrieves verified environmental templates posted by verified supply agencies
   */
  static getActivePacks(): MarketplaceEvidencePack[] {
    return [
      {
        packId: "MK-PACK-101",
        supplierName: "Berger Paints India",
        materialType: "Low-VOC Coatings and Adhesives",
        ratingStandard: "IGBC Green Homes",
        downloadsCount: 142
      },
      {
        packId: "MK-PACK-104",
        supplierName: "Saint-Gobain Glass",
        materialType: "High-Performance Glazing Systems",
        ratingStandard: "LEED India v4",
        downloadsCount: 88
      }
    ];
  }
}
