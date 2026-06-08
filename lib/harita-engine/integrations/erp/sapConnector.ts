export interface SapInvoiceRecord {
  invoiceNumber: string;
  vendorId: string;
  materialCode: string;
  quantityMetric: number;
  totalCostUsd: number;
  taxRegistrationNumber: string; // GST
}

export class SapConnector {
  private static sapRecords = new Map<string, SapInvoiceRecord[]>();

  /**
   * Fetches procurement data for a specific tenant scope
   */
  static async fetchProcurementRecords(tenantId: string): Promise<SapInvoiceRecord[]> {
    const existing = this.sapRecords.get(tenantId);
    if (existing) return existing;

    const mockRecords: SapInvoiceRecord[] = [
      {
        invoiceNumber: "SAP-INV-998812",
        vendorId: "Daikin Climate Systems",
        materialCode: "HVAC-VRV-01",
        quantityMetric: 4,
        totalCostUsd: 48000,
        taxRegistrationNumber: "GST-DKN-901"
      },
      {
        invoiceNumber: "SAP-INV-998815",
        vendorId: "Tata Structural Steel",
        materialCode: "STRUCT-STL-450",
        quantityMetric: 85, // tons
        totalCostUsd: 98000,
        taxRegistrationNumber: "GST-TATA-302"
      }
    ];

    this.sapRecords.set(tenantId, mockRecords);
    return mockRecords;
  }
}
