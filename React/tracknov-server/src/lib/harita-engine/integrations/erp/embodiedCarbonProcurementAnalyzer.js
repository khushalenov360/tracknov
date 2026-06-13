"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbodiedCarbonProcurementAnalyzer = void 0;
class EmbodiedCarbonProcurementAnalyzer {
    /**
     * Translates billing weight quantities into carbon footprint metrics
     */
    static analyzeCarbon(invoices) {
        return invoices.map((inv) => {
            let totalEmbodiedCarbonKg = 1200; // generic baseline
            if (inv.materialCategory.includes("HVAC")) {
                totalEmbodiedCarbonKg = Math.round(inv.totalCostUsd * 0.15);
            }
            else if (inv.materialCategory.includes("Structural")) {
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
exports.EmbodiedCarbonProcurementAnalyzer = EmbodiedCarbonProcurementAnalyzer;
