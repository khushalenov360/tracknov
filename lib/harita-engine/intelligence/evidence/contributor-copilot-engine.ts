export class ContributorCopilotEngine {
  public static async brief(query: string, projectId: string, runtimeContext: any): Promise<any> {
    return {
      message: "Contributor Copilot brief is currently in development.",
      query,
      projectId,
      status: "STUB",
    };
  }
}
