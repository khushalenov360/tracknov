"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierMetadataResolver = void 0;
class SupplierMetadataResolver {
    /**
     * Resolves a cleansed supplier name against corporate database mappings
     */
    static resolveMetadata(vendorName) {
        const nameLower = vendorName.toLowerCase();
        let supplierId = "SUP-GENERIC";
        let hasActiveCertification = false;
        let preApprovedMatchesCount = 0;
        if (nameLower.includes("daikin")) {
            supplierId = "SUP-001";
            hasActiveCertification = true;
            preApprovedMatchesCount = 14;
        }
        else if (nameLower.includes("berger")) {
            supplierId = "SUP-002";
            hasActiveCertification = true;
            preApprovedMatchesCount = 28;
        }
        else if (nameLower.includes("tata")) {
            supplierId = "SUP-003";
            hasActiveCertification = true;
            preApprovedMatchesCount = 8;
        }
        return {
            supplierId,
            hasActiveCertification,
            preApprovedMatchesCount
        };
    }
}
exports.SupplierMetadataResolver = SupplierMetadataResolver;
