export type EnovAITRequestContext = {
  tenantId: string;
  organizationId: string;
  projectId: string;
  userId: string;
};

export class EnovAITClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.ENOVAIT_API_URL || "https://api.enovait.local";
  }

  private async fetchWithContext(endpoint: string, context: EnovAITRequestContext, body: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context,
        ...body,
      }),
    });

    if (!response.ok) {
      throw new Error(`EnovAIT API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async chat(context: EnovAITRequestContext, message: string) {
    return this.fetchWithContext("/chat", context, { message });
  }

  async summarizeDocument(context: EnovAITRequestContext, documentId: string) {
    return this.fetchWithContext("/document-summary", context, { documentId });
  }

  async assessReadiness(context: EnovAITRequestContext, creditId: string) {
    return this.fetchWithContext("/readiness-assessment", context, { creditId });
  }

  async draftClarification(context: EnovAITRequestContext, documentId: string, parameters: any) {
    return this.fetchWithContext("/clarification-draft", context, { documentId, parameters });
  }

  async getRecommendations(context: EnovAITRequestContext, creditId: string) {
    return this.fetchWithContext("/recommendations", context, { creditId });
  }
}

export const enovaitClient = new EnovAITClient();
