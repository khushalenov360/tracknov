export interface DeliveryMetrics {
  generatedLength: number;
  apiLength: number;
  renderedLength: number;
}

export class ResponseDeliveryMonitor {
  private static metrics = new Map<string, DeliveryMetrics>();

  public static initialize(queryId: string) {
    this.metrics.set(queryId, {
      generatedLength: 0,
      apiLength: 0,
      renderedLength: 0
    });
  }

  public static logGenerated(queryId: string, length: number) {
    const metric = this.metrics.get(queryId);
    if (metric) metric.generatedLength += length;
  }

  public static logApiDelivered(queryId: string, length: number) {
    const metric = this.metrics.get(queryId);
    if (metric) metric.apiLength += length;
  }

  public static logRendered(queryId: string, length: number) {
    const metric = this.metrics.get(queryId);
    if (metric) {
      metric.renderedLength = length;
      this.validate(queryId);
    }
  }

  public static validate(queryId: string) {
    const metric = this.metrics.get(queryId);
    if (!metric) return;

    if (metric.generatedLength !== metric.renderedLength) {
      throw new Error(`[Response Delivery Certification Failed] Truncation detected! Generated: ${metric.generatedLength}, Rendered: ${metric.renderedLength}`);
    }
  }

  public static validateSentenceCompletion(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    const lastChar = trimmed[trimmed.length - 1];
    const validEndingChars = ['.', '!', '?', '"', '\'', '`', '>'];
    
    if (!validEndingChars.includes(lastChar) && !trimmed.endsWith("```")) {
      throw new Error(`[Response Delivery Certification Failed] Mid-sentence termination detected! Ends with: '${lastChar}'`);
    }
  }
}
