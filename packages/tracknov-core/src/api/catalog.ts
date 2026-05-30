export type ApiTier = "PUBLIC" | "INTERNAL" | "ENOVAIT";

export interface ApiEndpointDefinition {
  path: string;
  tier: ApiTier;
  description: string;
  requiresAuth: boolean;
  methods: string[];
}

export const API_CATALOG: Record<string, ApiEndpointDefinition> = {
  // EnovAIT Layer
  assistant: {
    path: "/api/assistant",
    tier: "ENOVAIT",
    description: "Core AI integration and copilot operations",
    requiresAuth: true,
    methods: ["GET", "POST", "PATCH", "DELETE"]
  },
  assistantProjectUpload: {
    path: "/api/assistant/project-upload",
    tier: "ENOVAIT",
    description: "AI-assisted project upload ingestion",
    requiresAuth: true,
    methods: ["POST"]
  },
  
  // Internal UI Layer
  projects: {
    path: "/api/projects",
    tier: "INTERNAL",
    description: "Tracknov project management",
    requiresAuth: true,
    methods: ["GET", "POST", "PATCH", "DELETE"]
  },
  documents: {
    path: "/api/documents",
    tier: "INTERNAL",
    description: "Document operations and lifecycle",
    requiresAuth: true,
    methods: ["GET", "POST", "PATCH", "DELETE"]
  },
  credits: {
    path: "/api/credits",
    tier: "INTERNAL",
    description: "Credit scoring and validation ops",
    requiresAuth: true,
    methods: ["GET", "POST", "PATCH"]
  },
  workflow: {
    path: "/api/workflow",
    tier: "INTERNAL",
    description: "State transition workflow management",
    requiresAuth: true,
    methods: ["POST"]
  },
  validation: {
    path: "/api/validation",
    tier: "INTERNAL",
    description: "Manual/Automated rule validation",
    requiresAuth: true,
    methods: ["POST"]
  },

  // Public Gateway
  // Any public integration endpoints would be registered here.
};

/**
 * Validates whether a given endpoint path is permitted for the specified tier.
 */
export function isEndpointPermittedForTier(path: string, tier: ApiTier): boolean {
  for (const key in API_CATALOG) {
    const endpoint = API_CATALOG[key];
    if (path.startsWith(endpoint.path)) {
      return endpoint.tier === tier;
    }
  }
  // Unregistered endpoints default to conservative rejection
  return false;
}
