export class ClarificationClassifier {
  classify(parsedIntent: any) {
    if (parsedIntent.requestType === 'missing_evidence') {
      return 'DOCUMENT_UPLOAD_REQUIRED';
    }
    return 'EXPLANATION_REQUIRED';
  }
}
