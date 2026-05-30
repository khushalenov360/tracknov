import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  buildFallbackAssistantReply,
  type AssistantContext,
} from "@/lib/assistant";
import { ragService } from "@/lib/services/rag-service";
import { toneService, type AssistantTone } from "@/lib/services/tone-service";
import { knowledgeEngine } from "@/lib/services/knowledge-engine";
import {
  getUnknownDataResponse,
  normalizeHaritaResponse,
  requiresExplicitConfirmationForExecution,
  routeHaritaIntent,
  semanticDisambiguateIntent,
  requiresToolCall,
  sanitizeContextText,
  sanitizeUserText,
} from "@/lib/services/harita-governance";
import { EnovAitBoundary } from "@/lib/api/enovaitApiBoundary";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { executeTool } from "@/lib/assistant-tools";
import { getSafeCapabilitiesContext } from "@/lib/services/capability-registry";
import { executeIntent } from "@/ai/orchestrator/execute-intent";
import { haritaRuntimeService } from "@/lib/services/harita-runtime-service";
import { createAiStream as edgeStream } from "@/lib/assistant/llm-streamer";

import { type AssistantRequest, createTextStream, createResponseStream } from "@/lib/assistant/stream-utils";
import { getWorkspaceSnapshot } from "@/lib/assistant/snapshot";
import { isFileQuestion, isUploadMappingIntent, buildAttachmentAnalysisReply, getProjectIdFromContext } from "@/lib/assistant/attachments";
import { applyResponseGovernance, logAiInteraction, tryDeterministicAnswer } from "@/lib/assistant/governance-filters";
import { tryDetectFunctionCalls } from "@/lib/assistant/ai-providers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const throttled = checkRateLimit(request, {
    key: "api:assistant:chat",
    limit: 40,
    windowMs: 60_000,
  });
  if (throttled) return throttled;

  const startedAt = Date.now();
  let body: AssistantRequest;

  try {
    body = (await request.json()) as AssistantRequest;
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  const context = body.context;
  const messages = body.messages ?? [];
  const attachments = (body.attachments ?? []).slice(0, 3);
  const idempotencyKey = body.idempotencyKey ?? null;

  if (!context || !context.title || !context.summary) {
    return new Response("Missing assistant context.", { status: 400 });
  }

  const latestPromptRaw = [...messages].reverse().find((message) => message.role === "user")?.content ?? "What should I do next?";
  const latestPrompt = sanitizeUserText(latestPromptRaw);
  const intent = routeHaritaIntent(latestPrompt);
  const recentContext = messages.slice(-3).map(m => m.content).join(" ");
  const intentCategory = semanticDisambiguateIntent(latestPrompt, recentContext);
  
  try {
    EnovAitBoundary.validateIntelligenceRequest("/api/assistant", "POST", { action: intentCategory });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  const focusedProjectId = getProjectIdFromContext(context);
  const { user, role, snapshot, projectIds, userEmail, userName: rawUserName } = await getWorkspaceSnapshot();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient();

  if (focusedProjectId && !projectIds.includes(focusedProjectId)) {
    const traceId = crypto.randomUUID();
    await supabase.from("security_events").insert({
      id: traceId,
      project_id: focusedProjectId,
      actor_id: user.id,
      event_type: "tenant_isolation_violation",
      severity: "critical",
      details: {
        action: "ai_harita_context_injection",
        blocked: true,
        injected_project_id: focusedProjectId,
        accessible_projects: projectIds,
        enforcement_layer: "AI Harita Route Guard",
        governance_law: "Section 10 — Tenant Isolation Law",
        security_model: "Section 27 — Security Event Model",
      },
    });
    return new Response(
      JSON.stringify({
        error: "ACCESS DENIED",
        status: 403,
        message: "Requested project context violates multi-tenant isolation boundaries. Access strictly denied.",
        security_trace_captured: true,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  if (intentCategory === "workflow_action" && focusedProjectId) {
    const { user: workflowUser, role: workflowRole } = await getWorkspaceSnapshot();
    if (!workflowUser) {
      return new Response("Unauthorized", { status: 401 });
    }
    const intentResult = await executeIntent({
      userId: workflowUser.id,
      role: workflowRole,
      projectContext: {
        projectId: focusedProjectId,
        projectName: context.title ?? null,
      },
      query: latestPrompt,
    });
    return createResponseStream(createTextStream(intentResult.message));
  }

  const userName = rawUserName || userEmail?.split("@")[0] || "there";
  const activeProjectId = focusedProjectId || projectIds[0];
  const session = await haritaRuntimeService.getOrCreateSession(user.id, activeProjectId);
  
  await haritaRuntimeService.storeMessage(session.id, "user", latestPrompt);
  const augmentedContext = await haritaRuntimeService.buildAugmentedContext(user.id, activeProjectId, context);

  const ragMatches = await ragService.retrieveContext({
    query: latestPrompt,
    projectIds: focusedProjectId ? [focusedProjectId] : projectIds ?? [],
    limit: 6,
  });
  
  const ragSnapshot = ragMatches.length
    ? ragMatches
        .map((item, index) => {
          const source = String(item.metadata?.source ?? "context");
          const code = String(item.metadata?.credit_code ?? "");
          return `RAG ${index + 1} [${source}${code ? `/${code}` : ""}] score=${item.score.toFixed(3)}: ${item.content}`;
        })
        .join("\n")
    : "No RAG matches found for current query.";
    
  const attachmentSummary = attachments.length
    ? [
        "Uploaded attachments:",
        ...attachments.map((file, index) => {
          const kb = Math.max(1, Math.round((file.size ?? 0) / 1024));
          return `${index + 1}. ${file.name} (${file.mimeType}, ${kb} KB)`;
        }),
      ].join("\n")
    : "Uploaded attachments: none";
    
  const compactSnapshot = focusedProjectId
    ? [snapshot, "", "Note: focus on current project only.", focusedProjectId].join("\n")
    : snapshot;
    
  const combinedSnapshot = sanitizeContextText([compactSnapshot, "", "Retrieved context:", ragSnapshot, "", attachmentSummary].join("\n"));
  const hasManualLock = combinedSnapshot.includes("Manual version lock:") && !combinedSnapshot.includes("Manual version lock: none");

  const deterministic = tryDeterministicAnswer(intent, combinedSnapshot);
  if (deterministic) {
    await logAiInteraction({
      userId: user.id,
      intent,
      query: latestPrompt,
      model: "deterministic",
      contextSize: combinedSnapshot.length,
      tokenUsage: 0,
      fallbackUsed: false,
      latencyMs: Date.now() - startedAt,
    });
    return createResponseStream(createTextStream(deterministic));
  }

  if ((intent === "mapping" || intent === "comparison" || intent === "summary") && !hasManualLock) {
    const manualLockReply = normalizeHaritaResponse({
      assessment: getUnknownDataResponse(),
      fit: "Not suitable",
      reason: "Project manual version is not locked for this workspace.",
      recommendation: "Ask Project Admin/Super User to upload and lock the guidebook first.",
      confirm: "Confirm?",
    });
    await logAiInteraction({
      userId: user.id,
      intent,
      query: latestPrompt,
      model: "deterministic",
      contextSize: combinedSnapshot.length,
      tokenUsage: 0,
      fallbackUsed: false,
      latencyMs: Date.now() - startedAt,
    });
    return createResponseStream(createTextStream(manualLockReply));
  }

  let resolvedTone: AssistantTone;
  if (body.tone) {
    resolvedTone = body.tone === "Guided" ? "Operator" : (body.tone === "Fast" ? "Power" : "Executive");
  } else {
    resolvedTone = await toneService.getUserTone(user.id, role);
  }

  if (isFileQuestion(latestPrompt) && attachments.length === 0) {
    const message = "No file is attached in this chat message. Please attach the file with the + button first.";
    await logAiInteraction({
      userId: user.id,
      intent,
      query: latestPrompt,
      model: "deterministic",
      contextSize: combinedSnapshot.length,
      tokenUsage: 0,
      fallbackUsed: false,
      latencyMs: Date.now() - startedAt,
    });
    return createResponseStream(createTextStream(message));
  }

  const isAnalysisAttachmentFlow =
    Boolean(attachments?.length) &&
    !isUploadMappingIntent(latestPrompt ?? "", {
      analysisOnly: body.pickedIntent === "analysis",
      hasAttachments: true,
    });

  if (!isAnalysisAttachmentFlow && requiresExplicitConfirmationForExecution(latestPrompt)) {
    const confirmReply = "I can prepare this upload flow, but execution needs explicit confirmation. Please reply: 'Confirm upload this to <credit code> as <document type>' to proceed.";
    await logAiInteraction({
      userId: user.id,
      intent,
      query: latestPrompt,
      model: "deterministic",
      contextSize: combinedSnapshot.length,
      tokenUsage: 0,
      fallbackUsed: false,
      latencyMs: Date.now() - startedAt,
    });
    return createResponseStream(createTextStream(confirmReply));
  }

  const AI_ENABLED = process.env.AI_ENABLED !== "false";
  if (!env.aiReady || !AI_ENABLED) {
    if (attachments.length > 0) {
      const file = attachments[0];
      const isAnalysisRequest = !isUploadMappingIntent(latestPrompt, { analysisOnly: body.pickedIntent === "analysis" }) || isFileQuestion(latestPrompt);
      const attachmentReply = isAnalysisRequest
        ? buildAttachmentAnalysisReply(userName, file, ragMatches)
        : [
            `Hi ${userName}, I can see your attached file: ${file.name}.`,
            "Tell me the credit code and document type you want, and I will prepare the workflow upload step.",
          ].join("\n");
      await logAiInteraction({
        userId: user.id,
        intent,
        query: latestPrompt,
        model: "fallback",
        contextSize: combinedSnapshot.length,
        tokenUsage: 0,
        fallbackUsed: true,
        latencyMs: Date.now() - startedAt,
      });
      return createResponseStream(createTextStream(attachmentReply));
    }
  }

  const toneInstructions = toneService.getToneInstructions(resolvedTone);

  const capabilitiesContext = [
      getSafeCapabilitiesContext((augmentedContext.surface as any) ?? "dashboard", role as any),
      knowledgeEngine.getPlatformRoadmapContext(),
      knowledgeEngine.getConstructionStageGateRules(),
    ].join("\n\n");

  const enrichedContext: AssistantContext = {
    ...augmentedContext,
    capabilities: capabilitiesContext,
    facts: [
      ...augmentedContext.facts,
      `User: ${userName || userEmail || "Unknown"}`,
      `User email: ${userEmail}`,
      `Resolved role: ${role}`,
      `Current Tone: ${resolvedTone}`,
      "Responses must be grounded in the workspace snapshot attached in system instructions.",
    ],
  };
  const mergedContext = { ...enrichedContext, summary: context.summary + "\n\n" + toneInstructions };

  if (attachments.length > 0) {
    const lastUserIndex = [...messages]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find((entry) => entry.message.role === "user")?.index;
    if (typeof lastUserIndex === "number") {
      const attachmentNote =
        "\n\nAttached files for this question:\n" +
        attachments
          .map((file, index) => `- ${index + 1}. ${file.name} (${file.mimeType})`)
          .join("\n") +
        "\nUse these attachments with workspace context before answering.";
      messages[lastUserIndex] = {
        ...messages[lastUserIndex],
        content: `${messages[lastUserIndex].content}${attachmentNote}`,
      };
    }
  }

  try {
    const edgeContextPayload = sanitizeContextText(["Retrieved context:", ragSnapshot, "", attachmentSummary].join("\n"));
    
    const toolsNeeded = requiresToolCall(intentCategory);
    const functionCalls = toolsNeeded
      ? await tryDetectFunctionCalls(mergedContext, messages, combinedSnapshot, role)
      : null;

    if (functionCalls && functionCalls.length > 0) {
      const results: Array<{ name: string; response: unknown }> = [];
      let navigateTo: string | undefined;

      for (const fc of functionCalls) {
        if (idempotencyKey && (fc.name === "reviewDocument" || fc.name.includes("Transition"))) {
           fc.args.idempotencyKey = fc.args.idempotencyKey || idempotencyKey;
        }
        const result = await executeTool(fc.name, fc.args);
        results.push({ name: fc.name, response: result });
        if (result.navigateTo) {
          navigateTo = result.navigateTo;
        }
      }

      const aiStream = await edgeStream(mergedContext, messages, edgeContextPayload, role, results);
      if (aiStream) {
        await logAiInteraction({
          userId: user.id,
          intent,
          query: latestPrompt,
          model: "multi-provider-tools",
          contextSize: combinedSnapshot.length,
          tokenUsage: Math.ceil((latestPrompt.length + combinedSnapshot.length) / 4),
          fallbackUsed: false,
          latencyMs: Date.now() - startedAt,
        });
        return createResponseStream(aiStream, navigateTo);
      }
    } else {
      const aiStream = await edgeStream(mergedContext, messages, edgeContextPayload, role);
      if (aiStream) {
        await logAiInteraction({
          userId: user.id,
          intent,
          query: latestPrompt,
          model: "multi-provider-stream",
          contextSize: combinedSnapshot.length,
          tokenUsage: Math.ceil((latestPrompt.length + combinedSnapshot.length) / 4),
          fallbackUsed: false,
          latencyMs: Date.now() - startedAt,
        });
        const finalStream = applyResponseGovernance(aiStream, session.id);
        return createResponseStream(finalStream);
      }
    }
  } catch (error) {
    console.error("[Assistant] AI pipeline failed:", error);
    
    if (attachments.length && isFileQuestion(latestPrompt)) {
      const analysis = buildAttachmentAnalysisReply(userName, attachments[0], ragMatches);
      await haritaRuntimeService.storeSemanticMemory(session.id, "analysis", attachments[0].name, {
        summary: analysis,
        timestamp: new Date().toISOString()
      });
      await haritaRuntimeService.storeMessage(session.id, "assistant", analysis);
      
      await logAiInteraction({
        userId: user.id,
        intent,
        query: latestPrompt,
        model: "fallback-analysis",
        contextSize: combinedSnapshot.length,
        tokenUsage: 0,
        fallbackUsed: true,
        latencyMs: Date.now() - startedAt,
      });
      return createResponseStream(createTextStream(analysis));
    }
  }

  const fallbackText = buildFallbackAssistantReply(context, latestPrompt);
  await haritaRuntimeService.storeMessage(session.id, "assistant", fallbackText);
  
  await logAiInteraction({
    userId: user.id,
    intent,
    query: latestPrompt,
    model: "fallback",
    contextSize: combinedSnapshot.length,
    tokenUsage: 0,
    fallbackUsed: true,
    latencyMs: Date.now() - startedAt,
  });
  return createResponseStream(createTextStream(fallbackText));
}
