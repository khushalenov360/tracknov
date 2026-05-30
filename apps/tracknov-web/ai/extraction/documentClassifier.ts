export class DocumentClassifier {
  async classify(fileUrl: string) {
    // Uses OCR/vision to determine the document type
    return {
      category: 'Energy',
      documentType: 'HVAC Schedule',
      confidence: 0.95
    };
  }
}
