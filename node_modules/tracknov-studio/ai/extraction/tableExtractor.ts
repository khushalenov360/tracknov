export class TableExtractor {
  async extract(fileUrl: string) {
    return {
      headers: ['Unit', 'Capacity', 'Efficiency'],
      rows: [['AHU-1', '5000 CFM', '0.75 kW/TR']]
    };
  }
}
