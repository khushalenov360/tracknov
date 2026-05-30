export interface ProcurementLinkage {
  invoiceId: string;
  cleansedVendor: string;
  targetCreditCode: string;
  billingLinkagePrecision: number;
}

export class ProcurementEvidenceMapper {
  /**
   * Generates documentation linkage candidates based on normalized bills
   */
  static generateLinkages(invoices: { standardInvoiceId: string; cleansedVendorName: string; materialCategory: string }[]): ProcurementLinkage[] {
    return invoices.map((inv) => {
      let targetCreditCode = "MR-C2"; // Structural material baseline
      let billingLinkagePrecision = 92;

      if (inv.materialCategory.includes("HVAC")) {
        targetCreditCode = "E-C1";
        billingLinkagePrecision = 96;
      } else if (inv.materialCategory.includes("Chemical")) {
        targetCreditCode = "IAQ-C3";
        billingLinkagePrecision = 95;
      }

      return {
        invoiceId: inv.standardInvoiceId,
        cleansedVendor: inv.cleansedVendorName,
        targetCreditCode,
        billingLinkagePrecision
      };
    });
  }
}
