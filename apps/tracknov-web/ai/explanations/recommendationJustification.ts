export class RecommendationJustification {
  justify(action: string, context: any) {
    if (action.includes('HVAC')) {
      return 'Required to calculate baseline energy performance and demonstrate 10% savings.';
    }
    return 'Improves overall project readiness by satisfying documentation requirements.';
  }
}
