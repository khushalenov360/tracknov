export interface ResponseIntegrityMetrics {
  queryId: string;
  generatedLength: number;
  deliveredLength: number;
  renderedLength?: number;
  streamChunks: number;
  completed: boolean;
  timestamp: number;
}

export class ResponseIntegrityMonitor {
  private static metrics = new Map<string, ResponseIntegrityMetrics>();

  public static initializeResponse(queryId: string) {
    this.metrics.set(queryId, {
      queryId,
      generatedLength: 0,
      deliveredLength: 0,
      streamChunks: 0,
      completed: false,
      timestamp: Date.now()
    });
  }

  public static logChunk(queryId: string, chunkLength: number) {
    const metric = this.metrics.get(queryId);
    if (metric) {
      metric.generatedLength += chunkLength;
      metric.deliveredLength += chunkLength; // Assuming 1:1 delivery for now
      metric.streamChunks += 1;
    }
  }

  public static markComplete(queryId: string, fullResponse: string) {
    const metric = this.metrics.get(queryId);
    if (metric) {
      metric.completed = true;
      this.validateIntegrity(metric, fullResponse);
    }
  }

  public static reportFrontendRender(queryId: string, renderedLength: number) {
    const metric = this.metrics.get(queryId);
    if (metric) {
      metric.renderedLength = renderedLength;
      this.validateIntegrity(metric, null);
    }
  }

  private static validateIntegrity(metric: ResponseIntegrityMetrics, fullResponse: string | null) {
    // Check lengths
    if (metric.generatedLength !== metric.deliveredLength) {
      console.warn(`[Integrity Warning] Length mismatch: generated=${metric.generatedLength}, delivered=${metric.deliveredLength}`);
    }

    if (metric.renderedLength !== undefined && metric.deliveredLength !== metric.renderedLength) {
      console.error(`[Integrity Error] Rendered length mismatch for ${metric.queryId}! Delivered: ${metric.deliveredLength}, Rendered: ${metric.renderedLength}`);
    }

    // Check sentence completion if the response is finished
    if (fullResponse && metric.completed) {
      this.checkSentenceCompletion(fullResponse);
    }
  }

  private static checkSentenceCompletion(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    const lastChar = trimmed[trimmed.length - 1];
    const validEndingChars = ['.', '!', '?', '"', '\'', '`', '>'];
    
    // Quick heuristic for code blocks or standard sentences
    if (!validEndingChars.includes(lastChar) && !trimmed.endsWith("```")) {
      console.warn(`[Integrity Warning] Response might be truncated. Ends with: '${lastChar}'`);
    }
  }

  public static getMetrics(queryId: string): ResponseIntegrityMetrics | undefined {
    return this.metrics.get(queryId);
  }
}
