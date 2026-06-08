export interface CertificationGap {
  currentPoints: number;
  securedPoints: number;
  riskPoints: number;
  projectedPoints: number;
  targetCertification: string;
  missingPoints: number;
  narrative: string;
  highestRiskCredits: string[];
}

export class CertificationGapEngine {
  public static async calculateCertificationGap(projectId: string, runtimeContext: any): Promise<CertificationGap> {
    let securedPoints = 0;
    let riskPoints = 0;
    
    const credits = runtimeContext.credits || [];
    const highestRiskCredits: string[] = [];
    
    let totalPoints = 0;
    for (const credit of credits) {
      const points = Number(credit.max_points ?? 0); 
      totalPoints += points;
      
      if (credit.status === "APPROVED" || credit.completion_pct === 100) {
        securedPoints += points;
      } else if (credit.status === "BLOCKED" || credit.completion_pct < 50) {
        riskPoints += points;
        highestRiskCredits.push(credit.credit_code);
      }
    }
    
    const projectedPoints = totalPoints - riskPoints;
    
    let targetCertification = "Gold";
    let targetPoints = 60;
    
    if (totalPoints < 10) {
       targetPoints = Math.max(1, Math.round(totalPoints * 0.6));
    }

    let narrative = "";
    if (securedPoints >= targetPoints) {
      targetCertification = "Platinum";
      targetPoints = totalPoints < 10 ? Math.round(totalPoints * 0.8) : 80;
      narrative = "Gold is already secured.\n\nHowever:\n";
    } else {
      narrative = `Targeting ${targetCertification}.\n\n`;
    }
    
    const missingPoints = Math.max(0, targetPoints - securedPoints);
    
    if (riskPoints > 0) {
      narrative += `${riskPoints} points remain at risk.\n\nIf these risks materialize,\n${targetCertification} becomes unattainable.\n\nHighest risk credits:\n` + highestRiskCredits.map(c => `- ${c}`).join("\n");
      narrative += "\n\nRecommended mitigation:\nResolve rejected evidence immediately.";
    } else {
      narrative += `On track for ${targetCertification}.`;
    }

    return {
      currentPoints: securedPoints,
      securedPoints,
      riskPoints,
      projectedPoints,
      targetCertification,
      missingPoints,
      narrative,
      highestRiskCredits
    };
  }
}
