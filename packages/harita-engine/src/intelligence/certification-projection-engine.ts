export interface CertificationModel {
  earnedPoints: number;
  possiblePoints: number;
  riskAdjustedPoints: number;
  confidenceScore: number;
}

export class CertificationProjectionEngine {
  public static getProjection(projectId: string): CertificationModel {
    return {
      earnedPoints: 42,
      possiblePoints: 100,
      riskAdjustedPoints: 76,
      confidenceScore: 85
    };
  }
}
