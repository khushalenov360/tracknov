export class ActionExtractor {
  extract(comment: string, intent: any) {
    if (intent.requestType === 'missing_evidence') {
      return [{ action: 'UPLOAD_DOCUMENT', details: intent.evidenceType }];
    }
    return [];
  }
}
