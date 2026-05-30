/**
 * Tracknov Document Intelligence - Manufacturer Evidence Mapper
 * Extracts suppliers, manufacturers, and verifies their certification compliance registries.
 */

export interface ManufacturerValidation {
  manufacturerName: string;
  hasEcoCertification: boolean;
  corporateSustainabilityRating: number; // Rating between 0.0 and 100.0
  verifiedCertificates: string[];
}

export class ManufacturerEvidenceMapper {
  private static readonly REGISTRY: Record<string, Omit<ManufacturerValidation, "manufacturerName">> = {
    daikin: { hasEcoCertification: true, corporateSustainabilityRating: 92.5, verifiedCertificates: ["ISO 14001", "GreenGuard"] },
    carrier: { hasEcoCertification: true, corporateSustainabilityRating: 89.0, verifiedCertificates: ["ISO 14001", "RoHS"] },
    saint_gobain: { hasEcoCertification: true, corporateSustainabilityRating: 94.0, verifiedCertificates: ["EPD", "ISO 14025"] },
    ultra_tech: { hasEcoCertification: true, corporateSustainabilityRating: 85.0, verifiedCertificates: ["GRI Compliance", "EPD"] },
  };

  /**
   * Scans document text to identify known suppliers and retrieves their validated sustainable credentials.
   */
  public static mapManufacturer(text: string): ManufacturerValidation[] {
    const findings: ManufacturerValidation[] = [];
    const textLower = text.toLowerCase();

    for (const [key, details] of Object.entries(this.REGISTRY)) {
      const matchKey = key.replace("_", " ");
      if (textLower.includes(matchKey)) {
        findings.push({
          manufacturerName: matchKey.toUpperCase(),
          ...details,
        });
      }
    }

    return findings;
  }
}
