export class ClarificationResponse {
  generateDraft(classification: string, intent: any) {
    if (classification === 'DOCUMENT_UPLOAD_REQUIRED') {
      return `Please upload the ${intent.evidenceType} documents. Our systems indicate this is missing.`;
    }
    return `We are reviewing the requirements for ${intent.evidenceType}.`;
  }
}
