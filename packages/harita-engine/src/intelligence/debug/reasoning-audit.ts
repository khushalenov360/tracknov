import { PipelineTracer } from "./pipeline-tracer";

export class ReasoningAudit {
  public static audit(question: string, reasonerName: string, output: any, tracer: PipelineTracer): void {
    if (reasonerName === "BlockerReasoner" && output.evidence) {
      const blockers = output.evidence.split("\n").filter((line: string) => line.trim().startsWith("-")).length;
      tracer.logStage(reasonerName, question, `${blockers} blockers identified`);
    } else {
      tracer.logStage(reasonerName, question, "Reasoning complete");
    }
  }
}
