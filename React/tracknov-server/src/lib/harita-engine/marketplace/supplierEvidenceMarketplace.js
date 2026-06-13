"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierEvidenceMarketplace = void 0;
class SupplierEvidenceMarketplace {
    /**
     * Retrieves verified environmental templates posted by verified supply agencies
     */
    static getActivePacks() {
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
exports.SupplierEvidenceMarketplace = SupplierEvidenceMarketplace;
