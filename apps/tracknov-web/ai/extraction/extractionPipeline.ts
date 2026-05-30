import { DocumentClassifier } from './documentClassifier';
import { MetadataExtractor } from './metadataExtractor';
import { TableExtractor } from './tableExtractor';
import { MetricExtractor } from './metricExtractor';

export class ExtractionPipeline {
  classifier = new DocumentClassifier();
  meta = new MetadataExtractor();
  table = new TableExtractor();
  metrics = new MetricExtractor();

  async processDocument(fileUrl: string) {
    const classification = await this.classifier.classify(fileUrl);
    const metadata = await this.meta.extract(fileUrl, classification.category);
    const tables = await this.table.extract(fileUrl);
    const specificMetrics = await this.metrics.extract(fileUrl, classification.documentType);

    return {
      classification,
      metadata,
      tables,
      specificMetrics
    };
  }
}
