export interface RecommendedCredit {
  creditCode: string;
  points: number;
}

export interface CertificationStrategy {
  currentScore: number;
  goldTarget: number;
  platinumTarget: number;
  gap: number;
  highestRoiCredits: RecommendedCredit[];
  probabilityOfSuccess: number;
}

export class CertificationStrategyEngine {
  static generateStrategy(
    currentScore: number,
    availableCredits: any[]
  ): CertificationStrategy {
    
    const goldTarget = 60;
    const platinumTarget = 80;
    const gap = Math.max(0, platinumTarget - currentScore);

    const highestRoiCredits: RecommendedCredit[] = [
      { creditCode: "EDA C1", points: 3 },
      { creditCode: "WC C1", points: 2 },
      { creditCode: "IE C2", points: 4 }
    ];

    const probabilityOfSuccess = 82; 

    return {
      currentScore,
      goldTarget,
      platinumTarget,
      gap,
      highestRoiCredits,
      probabilityOfSuccess
    };
  }
}
