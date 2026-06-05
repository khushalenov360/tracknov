export class ExecutivePrioritizationEngine {
  public static async getTopActions(projectId: string, runtimeContext: any): Promise<any> {
    return [
      { action: "Evaluate remaining credits", priority: "HIGH" },
    ];
  }
}
