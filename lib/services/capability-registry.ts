import type { AssistantSurface } from "@/lib/assistant";
import type { MemberRole } from "@/lib/types";

type Capability = {
  id: string;
  name: string;
  businessDescription: string;
  supportedSurfaces: AssistantSurface[] | "all";
  requiredRoles: MemberRole[] | "all";
  enabled: boolean;
};

// PHASE 1 & 2 & 3: CAPABILITY EXTRACTION, ABSTRACTION, REGISTRY
const REGISTRY: Capability[] = [
  {
    id: "doc_validation",
    name: "AI Document Validation",
    businessDescription: "Automatically analyzes uploaded evidence against credit requirements. It identifies missing keywords, checks data consistency, and provides confidence scores to ensure submissions meet certification standards.",
    supportedSurfaces: ["documents", "project", "dashboard"],
    requiredRoles: "all",
    enabled: true,
  },
  {
    id: "workflow_progression",
    name: "Certification Workflow Progression",
    businessDescription: "Manages the state of credit documentation from Draft to Approved. Documents progress through specific gates: Uploaded -> Under Review -> Clarification -> Approved. Tracks readiness for the final certification submission.",
    supportedSurfaces: ["credits", "documents", "project", "dashboard"],
    requiredRoles: "all",
    enabled: true,
  },
  {
    id: "member_management",
    name: "Team & Role Management",
    businessDescription: "Allows project administrators and owners to invite team members, assign responsibilities to specific credit documents, and manage role-based access for uploading or reviewing evidence.",
    supportedSurfaces: ["team", "project"],
    requiredRoles: ["super_user", "super_admin", "project_admin", "owner"],
    enabled: true,
  },
  {
    id: "credit_scoping",
    name: "Credit Scoping & Guidance",
    businessDescription: "Provides specific requirement checklists and mandatory criteria for green building rating systems (like IGBC). Shows exactly what documentation is required, optionally mapped from an imported baseline tracker.",
    supportedSurfaces: ["credits", "project"],
    requiredRoles: "all",
    enabled: true,
  },
  {
    id: "wallet_billing",
    name: "Token Usage & Billing",
    businessDescription: "Tracks consumption of platform tokens for actions like document uploads and AI reviews. Ensures the client's wallet has sufficient balance to continue processing project documents.",
    supportedSurfaces: ["dashboard"],
    requiredRoles: ["super_user", "client", "owner"],
    enabled: true,
  },
  {
    id: "escalation_resolution",
    name: "Document Clarification & Escalation",
    businessDescription: "Facilitates communication when a document does not meet requirements. Reviewers can flag documents for clarification, notifying the original uploader to provide corrected evidence.",
    supportedSurfaces: ["documents", "credits"],
    requiredRoles: ["super_user", "super_admin", "project_admin", "owner", "mep", "architect", "contractor", "consultant"],
    enabled: true,
  },
  {
    id: "construction_stagegate",
    name: "Construction Stage-Gate Tracking (v3.0)",
    businessDescription: "Planned feature: Automated verification of sustainability criteria at specific construction milestones (Foundation, Structure, Finishing).",
    supportedSurfaces: ["project"],
    requiredRoles: ["super_user", "owner"],
    enabled: false,
  },
  {
    id: "iot_monitoring",
    name: "Live Site Monitoring via Sensor API (v3.2)",
    businessDescription: "Planned feature: Real-time air quality and energy consumption monitoring via on-site IoT sensors integrated directly into the certification dashboard.",
    supportedSurfaces: ["dashboard"],
    requiredRoles: ["super_user"],
    enabled: false,
  }
];

// PHASE 4: ROLE-AWARE CONTEXT BUILDER
export function getSafeCapabilitiesContext(surface: AssistantSurface, role?: MemberRole): string {
  const relevantCapabilities = REGISTRY.filter(cap => {
    if (!cap.enabled) return false;
    
    const surfaceMatch = cap.supportedSurfaces === "all" || cap.supportedSurfaces.includes(surface);
    const roleMatch = cap.requiredRoles === "all" || (role && cap.requiredRoles.includes(role));
    
    return surfaceMatch && roleMatch;
  });

  if (relevantCapabilities.length === 0) {
    return "No specific platform capabilities are highlighted for this context.";
  }

  const lines = [
    "Platform Capabilities Available in Current Context:",
    ...relevantCapabilities.map(cap => `- **${cap.name}**: ${cap.businessDescription}`)
  ];

  return lines.join("\n");
}
