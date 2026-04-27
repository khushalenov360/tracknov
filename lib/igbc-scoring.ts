import type { CreditWorkspace, IgbcVariant } from "@/lib/types";

export const igbcScoreModel = {
  totalPoints: {
    new: 100,
    existing: 75,
  },
  categoryPoints: {
    EDA: { new: 8, existing: 8 },
    WC: { new: 12, existing: 12 },
    EE: { new: 22, existing: 22 },
    IM: { new: 24, existing: 6 },
    IE: { new: 29, existing: 21 },
    IID: { new: 5, existing: 5 },
  },
  certificationLevels: [
    { level: "Certified", new: [50, 59], existing: [37, 44], recognition: "Best Practices" },
    { level: "Silver", new: [60, 69], existing: [45, 52], recognition: "Outstanding Performance" },
    { level: "Gold", new: [70, 79], existing: [53, 60], recognition: "National Excellence" },
    { level: "Platinum", new: [80, 100], existing: [61, 75], recognition: "Global Leadership" },
  ],
} as const;

function creditCategory(credit: CreditWorkspace) {
  return credit.credit_code.split(" ")[0] as keyof typeof igbcScoreModel.categoryPoints;
}

export function scoreIgbcCredits(credits: CreditWorkspace[], variant: IgbcVariant = "new") {
  const earnedByCategory = new Map<string, number>();
  const totalsByCategory = new Map<string, number>();

  for (const category of Object.keys(igbcScoreModel.categoryPoints)) {
    earnedByCategory.set(category, 0);
    totalsByCategory.set(category, igbcScoreModel.categoryPoints[category as keyof typeof igbcScoreModel.categoryPoints][variant]);
  }

  const categoryCreditCounts = credits.reduce<Record<string, number>>((acc, credit) => {
    if (!credit.is_mandatory) {
      const category = creditCategory(credit);
      acc[category] = (acc[category] ?? 0) + 1;
    }
    return acc;
  }, {});

  for (const credit of credits) {
    if (credit.is_mandatory || credit.status !== "complete") {
      continue;
    }
    const category = creditCategory(credit);
    const total = igbcScoreModel.categoryPoints[category]?.[variant] ?? 0;
    const count = Math.max(categoryCreditCounts[category] ?? 1, 1);
    earnedByCategory.set(category, (earnedByCategory.get(category) ?? 0) + total / count);
  }

  const earned = Math.round(Array.from(earnedByCategory.values()).reduce((sum, value) => sum + value, 0));
  const totalAvailable = igbcScoreModel.totalPoints[variant];
  const level =
    [...igbcScoreModel.certificationLevels]
      .reverse()
      .find((item) => earned >= item[variant][0]) ?? null;

  return {
    earned,
    totalAvailable,
    percent: totalAvailable ? Math.round((earned / totalAvailable) * 100) : 0,
    level,
    categories: Array.from(totalsByCategory.entries()).map(([category, total]) => ({
      category,
      total,
      earned: Math.round(earnedByCategory.get(category) ?? 0),
    })),
  };
}
