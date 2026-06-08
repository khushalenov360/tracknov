export type CertificationStrategy = {
  currentScore: number;
  totalAvailable: number;
  blockedPoints: number;
  roadmapToGold: string[];
  roadmapToPlatinum: string[];
  highRiskCredits: string[];
};

export class CertificationStrategyEngine {
  calculateScore(credits: any[]): number {
    return credits
      .filter((c) => c.state === "APPROVED" || c.state === "complete")
      .reduce((sum, c) => sum + Number(c.max_points ?? 0), 0);
  }

  getStrategy(credits: any[]): CertificationStrategy {
    const currentScore = this.calculateScore(credits);
    
    // Simplistic heuristic for now
    const blockedCredits = credits.filter(c => c.state === "blocked");
    const blockedPoints = blockedCredits.reduce((sum, c) => sum + Number(c.max_points ?? 0), 0);
    
    const pendingCredits = credits.filter(c => c.state !== "APPROVED" && c.state !== "complete" && c.state !== "blocked");
    pendingCredits.sort((a, b) => Number(b.max_points ?? 0) - Number(a.max_points ?? 0));

    const totalAvailable = currentScore + pendingCredits.reduce((sum, c) => sum + Number(c.max_points ?? 0), 0);

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

    return {
      currentScore,
      totalAvailable,
      blockedPoints,
      roadmapToGold,
      roadmapToPlatinum,
      highRiskCredits: blockedCredits.map(c => c.credit_code)
    };
  }

  generateContextString(strategy: CertificationStrategy): string {
    return `
[CERTIFICATION STRATEGY ENGINE]
Current Achievable Score: ${strategy.currentScore}
Total Possible Score: ${strategy.totalAvailable}
Blocked Points (High Risk): ${strategy.blockedPoints}
Fastest Route to Gold (60 pts): ${strategy.roadmapToGold.length ? strategy.roadmapToGold.join(", ") : "Achieved"}
Fastest Route to Platinum (80 pts): ${strategy.roadmapToPlatinum.length ? strategy.roadmapToPlatinum.join(", ") : "Achieved or Impossible"}
High Risk Credits: ${strategy.highRiskCredits.join(", ") || "None"}
`;
  }
}

export const certificationStrategyEngine = new CertificationStrategyEngine();
