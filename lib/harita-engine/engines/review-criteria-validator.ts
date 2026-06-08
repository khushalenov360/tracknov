export interface ReviewCriteriaValidation {
  creditHasCriteria: boolean;
  criteriaCount: number;
  criteriaTextExists: boolean;
  actualCriteria: string[];
}

export class ReviewCriteriaValidator {
  /**
   * Validates review criteria for a specific credit to prevent hallucinated fallback text.
   */
  public static validate(
    creditCode: string,
    rawCriteriaFromDb: any[] | null | undefined
  ): ReviewCriteriaValidation {
    if (!rawCriteriaFromDb || rawCriteriaFromDb.length === 0) {
      return {
        creditHasCriteria: false,
        criteriaCount: 0,
        criteriaTextExists: false,
        actualCriteria: []
      };
    }

    const validCriteria = rawCriteriaFromDb
      .filter(c => c && typeof c.criteria_text === 'string' && c.criteria_text.trim().length > 0)
      .map(c => c.criteria_text.trim());

    return {
      creditHasCriteria: validCriteria.length > 0,
      criteriaCount: validCriteria.length,
      criteriaTextExists: validCriteria.length > 0,
      actualCriteria: validCriteria
    };
  }

  public static getCriteriaContext(creditCode: string, rawCriteriaFromDb: any[] | null | undefined): string {
    const validation = this.validate(creditCode, rawCriteriaFromDb);
    
    if (!validation.creditHasCriteria) {
      return `WARNING: Review criteria for ${creditCode} is unavailable in the database. Do NOT hallucinate criteria.`;
    }

    return `
[REVIEW CRITERIA for ${creditCode}]
${validation.actualCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}
`;
  }
}
