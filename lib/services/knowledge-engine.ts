/**
 * TRACKNOV — Knowledge Engine Service
 * Section 6 & 8: IGBC Knowledge Engine & Planned Feature Roadmap
 *
 * Provides the AI with expert-level details on planned but currently 
 * disabled platform features, allowing it to act as a "Product Expert".
 */

export type PlatformFeatureRoadmap = {
  version: string;
  name: string;
  description: string;
  status: "planned" | "beta" | "production";
  targetDate?: string;
};

const ROADMAP: PlatformFeatureRoadmap[] = [
  {
    version: "v3.0",
    name: "Construction Stage-Gate Tracking",
    description: "Automated verification of sustainability criteria at Foundation, Structure, and Finishing milestones. Includes real-time evidence auditing during construction site-visits.",
    status: "planned",
    targetDate: "Q3 2026",
  },
  {
    version: "v3.2",
    name: "Live Site Monitoring via Sensor API",
    description: "Integration with on-site IoT sensors for real-time indoor air quality (CO2, PM2.5), energy consumption, and water flow monitoring. Data feeds directly into IGBC O&M credits.",
    status: "planned",
    targetDate: "Q1 2027",
  },
  {
    version: "v2.6",
    name: "Automated Carbon Footprint Calculator",
    description: "Calculates embodied carbon for building materials uploaded to the Narrative category using standardized emission factors.",
    status: "beta",
    targetDate: "Q4 2025",
  }
];

export const knowledgeEngine = {
  /**
   * Returns a concise summary of the platform roadmap for AI context.
   */
  getPlatformRoadmapContext(): string {
    const lines = [
      "Tracknov Product Roadmap (Future Capabilities):",
      ...ROADMAP.map(f => `- **${f.name} (${f.version})**: ${f.description} [Status: ${f.status.toUpperCase()}]`)
    ];
    return lines.join("\n");
  },

  /**
   * Returns specific IGBC domain knowledge for construction stage-gates.
   */
  getConstructionStageGateRules(): string {
    return [
      "IGBC Construction Stage-Gate Requirements (Mock Engine):",
      "1. Foundation: Soil erosion control measures must be documented via time-stamped photos.",
      "2. Structure: RMC (Ready Mix Concrete) invoices must be verified against regional sourcing distance limits (typically < 160km).",
      "3. Finishing: VOC content labels for all paints and adhesives must be scanned and matched against IGBC limit tables."
    ].join("\n");
  }
};
