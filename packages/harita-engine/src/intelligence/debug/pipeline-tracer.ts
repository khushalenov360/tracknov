export interface PipelineTrace {
  stage: string;
  timestamp: string;
  question: string;
  output: string;
  durationMs: number;
}

export class PipelineTracer {
  private traces: PipelineTrace[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  public logStage(stage: string, question: string, output: string): void {
    const duration = Date.now() - this.startTime;
    const trace: PipelineTrace = {
      stage,
      timestamp: new Date().toISOString(),
      question,
      output,
      durationMs: duration
    };
    
    this.traces.push(trace);
    this.startTime = Date.now(); // Reset for next stage
    
    if (process.env.HARITA_DEBUG === 'true') {
      console.log(`\n[HARITA_TRACE]`);
      console.log(`Stage:\n${stage}`);
      console.log(`Output:\n${output}`);
      console.log(`Duration:\n${duration}ms`);
    }
  }

  public getTraces(): PipelineTrace[] {
    return this.traces;
  }
}
