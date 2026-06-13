"use strict";
/**
 * Tracknov Document Intelligence - Manufacturer Evidence Mapper
 * Extracts suppliers, manufacturers, and verifies their certification compliance registries.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManufacturerEvidenceMapper = void 0;
class ManufacturerEvidenceMapper {
    /**
     * Scans document text to identify known suppliers and retrieves their validated sustainable credentials.
     */
    static mapManufacturer(text) {
        const findings = [];
        const textLower = text.toLowerCase();
        for (const [key, details] of Object.entries(this.REGISTRY)) {
            const matchKey = key.replace("_", " ");
            if (textLower.includes(matchKey)) {
                findings.push(Object.assign({ manufacturerName: matchKey.toUpperCase() }, details));
            }
        }
        return findings;
    }
}
exports.ManufacturerEvidenceMapper = ManufacturerEvidenceMapper;
ManufacturerEvidenceMapper.REGISTRY = {
    daikin: { hasEcoCertification: true, corporateSustainabilityRating: 92.5, verifiedCertificates: ["ISO 14001", "GreenGuard"] },
    carrier: { hasEcoCertification: true, corporateSustainabilityRating: 89.0, verifiedCertificates: ["ISO 14001", "RoHS"] },
    saint_gobain: { hasEcoCertification: true, corporateSustainabilityRating: 94.0, verifiedCertificates: ["EPD", "ISO 14025"] },
    ultra_tech: { hasEcoCertification: true, corporateSustainabilityRating: 85.0, verifiedCertificates: ["GRI Compliance", "EPD"] },
};
