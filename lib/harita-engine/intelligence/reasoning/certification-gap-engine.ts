export class CertificationGapEngine {
  public static async calculateCertificationGap(projectId: string, runtimeContext: any): Promise<any> {
    return {
      securedPoints: 0,
      targetPoints: 47,
      gap: 47,
    };
  }
}
