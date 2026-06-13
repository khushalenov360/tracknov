"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceNormalizationEngine = void 0;
class InvoiceNormalizationEngine {
    /**
     * Cleanses raw parameters to prevent parsing mismatches in submittal mapping
     */
    static normalize(rawInvoice, system) {
        const cleansedVendorName = (rawInvoice.vendorId || rawInvoice.vendorName || rawInvoice.ledgerName || "Unknown Vendor")
            .trim()
            .replace(/\bLtd\b|\bCorp\b/gi, "");
        const totalCostUsd = parseFloat(rawInvoice.totalCostUsd || rawInvoice.amountUsd || rawInvoice.debitAmount || "0");
        const taxReg = rawInvoice.taxRegistrationNumber || "";
        const hasGstRegistration = taxReg.length > 0 || (rawInvoice.narrationNote && rawInvoice.narrationNote.includes("GST"));
        let materialCategory = "Structural Elements";
        const desc = (rawInvoice.itemDescription || rawInvoice.materialCode || "").toLowerCase();
        if (desc.includes("hvac") || desc.includes("chiller") || desc.includes("ac")) {
            materialCategory = "Mechanical HVAC";
        }
        else if (desc.includes("paint") || desc.includes("coat") || desc.includes("low-voc")) {
            materialCategory = "Chemical Finishes";
        }
        return {
            standardInvoiceId: `NORM-${system}-${Math.floor(Math.random() * 9000 + 1000)}`,
            sourceSystem: system,
            cleansedVendorName,
            totalCostUsd,
            hasGstRegistration,
            materialCategory
        };
    }
}
exports.InvoiceNormalizationEngine = InvoiceNormalizationEngine;
