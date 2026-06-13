"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceSearchEngine = void 0;
class EvidenceSearchEngine {
    /**
     * Search files matching context while enforcing strict tenant isolation boundaries
     */
    static search(tenantId, query) {
        const sanitizedQuery = query.toLowerCase().trim();
        if (!sanitizedQuery) {
            return this.mockDatabase.filter((item) => item.tenantId === tenantId);
        }
        return this.mockDatabase.filter((item) => {
            // 1. Enforce absolute tenant boundary
            if (item.tenantId !== tenantId)
                return false;
            // 2. Perform textual lookups
            return (item.name.toLowerCase().includes(sanitizedQuery) ||
                item.type.toLowerCase().includes(sanitizedQuery) ||
                item.creditCategory.toLowerCase().includes(sanitizedQuery) ||
                item.textExcerpt.toLowerCase().includes(sanitizedQuery));
        });
    }
}
exports.EvidenceSearchEngine = EvidenceSearchEngine;
// Mock indexed evidence database (strictly tenant-isolated during runtime lookup)
EvidenceSearchEngine.mockDatabase = [
    {
        id: "EVID-001",
        tenantId: "tenant-alpha",
        name: "Daikin_VRV_IV_Specs_Hospital.pdf",
        type: "Manufacturer Certificate",
        creditCategory: "HVAC Efficiency (E-C1)",
        priorApprovalsCount: 8,
        duplicateProbability: 2.5,
        lastUsageTimestamp: Date.now() - 3600000 * 24, // 1 day ago
        approvalLineage: "Approved on Sigma Hospital Project V2 by Core Auditor",
        frameworkCompatibility: ["LEED v4", "IGBC Green"],
        textExcerpt: "Variable Refrigerant Volume (VRV) models include COP ratings of 4.2 under full hospital ventilation loads."
    },
    {
        id: "EVID-002",
        tenantId: "tenant-alpha",
        name: "Berger_Low_VOC_Paint_Certificate.pdf",
        type: "Supplier Chemical Analysis",
        creditCategory: "Indoor Air Quality (IAQ-C3)",
        priorApprovalsCount: 14,
        duplicateProbability: 0.1,
        lastUsageTimestamp: Date.now() - 3600000 * 48, // 2 days ago
        approvalLineage: "Approved on Harita Tech Block D by Senior Reviewer",
        frameworkCompatibility: ["LEED v4", "GRIHA v2019"],
        textExcerpt: "Berger paint testing certifies VOC emissions remain below 5g/L, complying with maximum indoor air hygiene thresholds."
    },
    {
        id: "EVID-003",
        tenantId: "tenant-alpha",
        name: "Tata_Recycled_Steel_Mill_Test.pdf",
        type: "Mill Test Certificate",
        creditCategory: "Materials & Resources (MR-C2)",
        priorApprovalsCount: 5,
        duplicateProbability: 1.2,
        lastUsageTimestamp: Date.now() - 3600000 * 12,
        approvalLineage: "Approved on Bhavarkua Core Structural Phase",
        frameworkCompatibility: ["LEED v4", "IGBC Green", "GRIHA v2019"],
        textExcerpt: "Tata Steel validates 84% post-consumer recycled structural members fabricated for green zone developments."
    }
];
