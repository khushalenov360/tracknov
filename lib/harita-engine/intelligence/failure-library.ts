// We use a simulated DB stub for now, but this hooks directly into the Learning Engine
export class FailureLibrary {
  private static failures: any[] = [];

  public static logFailure(projectId: string, question: string, response: string, failureType: string, severity: string, details?: any) {
    const failureRecord = {
      timestamp: new Date().toISOString(),
      projectId,
      question,
      response,
      failureType,
      severity,
      details
    };
    this.failures.push(failureRecord);
    console.log(`[FAILURE_LIBRARY] Logged ${failureType} severity: ${severity}`);
    console.log(`Details:`, details);
  }

  public static getFailures(projectId: string) {
    return this.failures.filter(f => f.projectId === projectId);
  }
}
