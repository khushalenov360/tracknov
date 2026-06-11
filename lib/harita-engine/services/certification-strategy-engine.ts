export type CertificationStrategy = {
  currentScore: number;
  totalAvailable: number;
  blockedPoints: number;
  roadmapToGold: string[];
  roadmapToPlatinum: string[];
  highRiskCredits: string[];
  highRoiCredits?: any[];
};

export class CertificationStrategyEngine {
  calculateScore(credits: any[]): number {
    return credits
      .filter((c) => !c.na && (c.state === "APPROVED" || c.state === "complete"))
      .reduce((sum, c) => sum + Number(c.max_points ?? 0), 0);
  }

  getStrategy(credits: any[]): CertificationStrategy {
    const activeCredits = credits.filter(c => !c.na);
    const currentScore = this.calculateScore(activeCredits);
    
    // Use status field (uppercase) — the state alias was incorrect
    const blockedCredits = activeCredits.filter(c => c.status === "BLOCKED" || c.state === "BLOCKED" || c.state === "blocked");
    const blockedPoints = blockedCredits.reduce((sum, c) => sum + Number(c.max_points ?? 0), 0);
    
    const pendingCredits = activeCredits.filter(c =>
      c.status !== "APPROVED" && c.status !== "complete" &&
      c.status !== "BLOCKED" && c.state !== "BLOCKED" && c.state !== "blocked"
    );
    pendingCredits.sort((a, b) => Number(b.max_points ?? 0) - Number(a.max_points ?? 0));

    // totalAvailable = current + pending + blocked (max achievable if all resolved)
    const totalAvailable = currentScore +
      pendingCredits.reduce((sum, c) => sum + Number(c.max_points ?? 0), 0) +
      blockedPoints;

    const roadmapToGold: string[] = [];
    let simScore = currentScore;
    for (const c of pendingCredits) {
      if (simScore >= 60) break;
      roadmapToGold.push(c.credit_code);
      simScore += Number(c.max_points ?? 0);
    }

    const roadmapToPlatinum: string[] = [...roadmapToGold];
    for (const c of pendingCredits.slice(roadmapToGold.length)) {
      if (simScore >= 80) break;
      roadmapToPlatinum.push(c.credit_code);
      simScore += Number(c.max_points ?? 0);
    }

    const highRoiCredits = pendingCredits
      .map(c => ({
        credit: c.credit_code,
        roi: Number(c.max_points ?? 0) * (c.probability || 0.8), // Assume 80% if not set
        probabilityPercentile: (c.probability || 0.8) * 100
      }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 3);

    return {
      currentScore,
      totalAvailable,
      blockedPoints,
      roadmapToGold,
      roadmapToPlatinum,
      highRiskCredits: blockedCredits.map(c => c.credit_code),
      highRoiCredits
    };
  }

  generateContextString(strategy: CertificationStrategy & { highRoiCredits?: any[] }): string {
    const roiString = strategy.highRoiCredits 
      ? strategy.highRoiCredits.map(r => `${r.credit} (${r.probabilityPercentile}% prob)`).join(", ") 
      : "None";
      
    return `
[CERTIFICATION STRATEGY ENGINE]
Current Achievable Score: ${strategy.currentScore}
Total Possible Score: ${strategy.totalAvailable}
Blocked Points (High Risk): ${strategy.blockedPoints}
Fastest Route to Gold (60 pts): ${strategy.roadmapToGold.length ? strategy.roadmapToGold.join(", ") : "Achieved"}
Fastest Route to Platinum (80 pts): ${strategy.roadmapToPlatinum.length ? strategy.roadmapToPlatinum.join(", ") : "Achieved or Impossible"}
High Risk Credits: ${strategy.highRiskCredits.join(", ") || "None"}
Highest ROI Credits: ${roiString}
`;
  }
}

export const certificationStrategyEngine = new CertificationStrategyEngine();
