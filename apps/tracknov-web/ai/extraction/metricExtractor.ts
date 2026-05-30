export class MetricExtractor {
  async extract(fileUrl: string, documentType: string) {
    if (documentType === 'HVAC Schedule') {
      return {
        hvac_capacity: '5000 CFM',
        efficiency: '0.75 kW/TR'
      };
    }
    return {};
  }
}
