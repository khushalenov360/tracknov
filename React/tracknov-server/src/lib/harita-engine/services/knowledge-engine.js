"use strict";
/**
 * TRACKNOV — Knowledge Engine Service
 * Section 6 & 8: IGBC Knowledge Engine & Planned Feature Roadmap
 *
 * Provides the AI with expert-level details on planned but currently
 * disabled platform features, allowing it to act as a "Product Expert".
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeEngine = void 0;
const ROADMAP = [
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
exports.knowledgeEngine = {
    /**
     * Returns a concise summary of the platform roadmap for AI context.
     */
    getPlatformRoadmapContext() {
        const lines = [
            "Tracknov Product Roadmap (Future Capabilities):",
            ...ROADMAP.map(f => `- **${f.name} (${f.version})**: ${f.description} [Status: ${f.status.toUpperCase()}]`)
        ];
        return lines.join("\n");
    },
    /**
     * Returns specific IGBC domain knowledge for construction stage-gates.
     */
    getConstructionStageGateRules() {
        return [
            "IGBC Construction Stage-Gate Requirements:",
            "1. FOUNDATION MILESTONE:",
            "   - Soil Erosion Control: Must provide geo-tagged photos of silt fences, sedimentation pits, and mulching.",
            "   - Excavation Safety: Records of shoring, strutting, and dewatering logs required.",
            "   - Topsoil Preservation: Evidence of topsoil stockpiling and stabilization.",
            "",
            "2. STRUCTURE MILESTONE:",
            "   - Concrete (RMC): All invoices must prove sourcing within 160km to claim regional material points.",
            "   - Steel: Mill certificates must show >15% recycled content (post-consumer + half pre-consumer).",
            "   - Formwork: Evidence of at least 5-time reuse or use of eco-friendly materials.",
            "",
            "3. FINISHING MILESTONE:",
            "   - Low-VOC: Lab reports for all paints, adhesives, and sealants must match IGBC Table 4 limits.",
            "   - FSC Wood: Chain of custody (CoC) certificates for at least 50% of wood-based materials.",
            "   - Waste Management: Proof of 75% construction waste diversion from landfills via recycler gate-passes."
        ].join("\n");
    }
};
