import type { FunctionCall, FunctionDeclaration, FunctionResponse } from "@google/genai";
import type { HaritaContext, WritePermission } from "../services/vertexService";
import {
  calculateCreditGap,
  calculateCreditGapDeclaration,
  getComplianceThresholds,
  getComplianceThresholdsDeclaration,
  getGuidebookClause,
  lookupGuidebookClauseDeclaration,
} from "./complianceTools";
import {
  assignComplianceTaskDeclaration,
  checkDocumentPipelineDeclaration,
  getProjectSnapshotDeclaration,
  runPmTool,
} from "./pmTools";

export const haritaToolDeclarations: FunctionDeclaration[] = [
  getProjectSnapshotDeclaration,
  checkDocumentPipelineDeclaration,
  assignComplianceTaskDeclaration,
  lookupGuidebookClauseDeclaration,
  getComplianceThresholdsDeclaration,
  calculateCreditGapDeclaration,
];

async function executeTool(name: string, args: Record<string, unknown>, context?: HaritaContext, writePermission?: WritePermission) {
  switch (name) {
    case "get_project_snapshot":
    case "check_document_pipeline":
    case "assign_compliance_task":
      return runPmTool(name, args, context, writePermission);
    case "lookup_guidebook_clause":
      return getGuidebookClause(args, context);
    case "get_compliance_thresholds":
      return getComplianceThresholds(args, context);
    case "calculate_credit_gap":
      return calculateCreditGap(args);
    default:
      throw new Error(`Unknown Harita tool: ${name}`);
  }
}

export async function executeHaritaToolCalls(
  functionCalls: FunctionCall[],
  context?: HaritaContext,
  writePermission?: WritePermission,
): Promise<FunctionResponse[]> {
  const responses = await Promise.all(functionCalls.map(async (functionCall) => {
    const name = functionCall.name || "unknown_tool";
    try {
      const output = await executeTool(name, functionCall.args || {}, context, writePermission);
      return {
        id: functionCall.id,
        name,
        response: { output },
      } satisfies FunctionResponse;
    } catch (error) {
      return {
        id: functionCall.id,
        name,
        response: {
          error: error instanceof Error ? error.message : "Tool execution failed.",
        },
      } satisfies FunctionResponse;
    }
  }));

  return responses;
}
