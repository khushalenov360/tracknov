export class ConfidenceEngine {
  calculate(action: string, context: any) {
    if (context.hasMandatoryBaseline) return 98;
    if (context.isOptionalCredit) return 85;
    return 90;
  }
}
