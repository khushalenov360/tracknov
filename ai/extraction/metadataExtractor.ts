export class MetadataExtractor {
  async extract(fileUrl: string, category: string) {
    return {
      title: 'HVAC Unit Schedule - Level 1',
      date: '2024-05-15',
      author: 'MEP Consultant',
      revision: 'R2'
    };
  }
}
