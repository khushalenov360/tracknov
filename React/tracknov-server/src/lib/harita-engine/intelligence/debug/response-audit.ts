import { PipelineTracer } from "./pipeline-tracer";

export class ResponseAudit {
  public static audit(question: string, plannerName: string, finalPrompt: string, tracer: PipelineTracer): void {
    tracer.logStage(plannerName, question, finalPrompt);
  }
}
