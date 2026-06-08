export interface ProcurementCarbonDetail {
  invoiceId: string;
  cleansedVendor: string;
  totalEmbodiedCarbonKg: number;
}

export class EmbodiedCarbonProcurementAnalyzer {
  /**
   * Translates billing weight quantities into carbon footprint metrics
   */
  static analyzeCarbon(
    invoices: { standardInvoiceId: string; cleansedVendorName: string; materialCategory: string; totalCostUsd: number }[]
  ): ProcurementCarbonDetail[] {
    return invoices.map((inv) => {
      let totalEmbodiedCarbonKg = 1200; // generic baseline

      if (inv.materialCategory.includes("HVAC")) {
        totalEmbodiedCarbonKg = Math.round(inv.totalCostUsd * 0.15);
      } else if (inv.materialCategory.includes("Structural")) {
        totalEmbodiedCarbonKg = Math.round(inv.totalCostUsd * 0.45);
      }

      return {
        invoiceId: inv.standardInvoiceId,
        cleansedVendor: inv.cleansedVendorName,
        totalEmbodiedCarbonKg
      };
    });
  }
}
