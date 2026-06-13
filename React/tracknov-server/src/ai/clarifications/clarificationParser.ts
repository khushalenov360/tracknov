export class ClarificationParser {
  async parse(comment: string) {
    // e.g. "Provide HVAC efficiency calculations."
    // In production, this calls OpenAI or similar to extract structured intent.
    return {
      evidenceType: 'HVAC',
      requestType: 'missing_evidence',
      extractedKeywords: ['efficiency', 'calculations']
    };
  }
}
