export interface UserFrictionScore {
  onboardingAbandonmentChance: number;
  uploadFrictionLevel: "LOW" | "MEDIUM" | "HIGH";
  clarificationConfusionIndex: number; // 0 to 100
}

export class FrictionAnalyticsEngine {
  /**
   * Assesses frustration metrics using rage clicks and hesitation records
   */
  static calculateFriction(
    rageClicksCount: number,
    uploadRetries: number,
    hesitationSeconds: number
  ): UserFrictionScore {
    let onboardingAbandonmentChance = Math.min(100, rageClicksCount * 12 + uploadRetries * 8);
    let clarificationConfusionIndex = Math.min(100, Math.round(hesitationSeconds * 2.4));

    let uploadFrictionLevel: UserFrictionScore["uploadFrictionLevel"] = "LOW";
    if (uploadRetries > 4) {
      uploadFrictionLevel = "HIGH";
    } else if (uploadRetries > 1) {
      uploadFrictionLevel = "MEDIUM";
    }

    return {
      onboardingAbandonmentChance,
      uploadFrictionLevel,
      clarificationConfusionIndex
    };
  }
}
