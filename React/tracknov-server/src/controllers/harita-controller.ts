import { v4 as uuidv4 } from "uuid";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildFallbackAssistantReply,
  type AssistantContext,
} from "@/lib/harita-engine/assistant";
import { ragService } from "@/lib/harita-engine/services/rag-service";
import { toneService, type AssistantTone } from "@/lib/harita-engine/services/tone-service";
import { knowledgeEngine } from "@/lib/harita-engine/services/knowledge-engine";
import {
  getUnknownDataResponse,
  normalizeHaritaResponse,
  requiresExplicitConfirmationForExecution,
  routeHaritaIntent,
  semanticDisambiguateIntent,
  requiresToolCall,
  sanitizeContextText,
  sanitizeUserText,
  sanitizeAiResponse,
  filterTechnicalLeakage,
  containsAuthoritativeClaim,
  getAuthoritativeClaimRefusal,
} from "@/lib/harita-engine/services/harita-governance";
import { EnovAitBoundary } from "@/lib/core/api/enovaitApiBoundary";
import { checkRateLimit } from "@/lib/harita-engine/security/rate-limit";
import { executeTool } from "@/lib/harita-engine/assistant-tools";
import { getSafeCapabilitiesContext } from "@/lib/harita-engine/services/capability-registry";
import { executeIntent } from "@/ai/orchestrator/execute-intent";
import { haritaRuntimeService } from "@/lib/harita-engine/services/harita-runtime-service";
import { SemanticQuarantineEngine } from "@/lib/harita-engine/governance/semanticQuarantineEngine";
import { createAiStream as edgeStream } from "@/lib/harita-engine/assistant/llm-streamer";
import { QuestionClassifier, QuestionType } from "@/lib/harita-engine/intelligence/reasoning/question-classifier";
import { ReasoningEngine } from "@/lib/harita-engine/intelligence/reasoning/reasoning-engine";
import { ConsultantResponsePlannerV2 } from "@/lib/harita-engine/intelligence/consultant-response-planner-v2";
import { RoutingGovernor } from "@/lib/harita-engine/runtime/routing-governor";
import { RoutingViolation } from "@/lib/harita-engine/runtime/entity-validator";
import { type AssistantRequest, createTextStream, createResponseStream } from "@/lib/harita-engine/assistant/stream-utils";
import { assembleRuntimeContext, formatRuntimeContext } from "@/lib/harita-engine/lib/runtime/runtime-context-assembler";
import { isFileQuestion, isUploadMappingIntent, buildAttachmentAnalysisReply, getProjectIdFromContext } from "@/lib/harita-engine/assistant/attachments";
import { applyResponseGovernance, logAiInteraction, tryDeterministicAnswer } from "@/lib/harita-engine/assistant/governance-filters";
import { tryDetectFunctionCalls } from "@/lib/harita-engine/assistant/ai-providers";
import { getCurrentUser } from "@/lib/data";
import { generateExecutionPlan } from "@/lib/harita-engine/intelligence/agents/planner";
import { executePlan } from "@/lib/harita-engine/intelligence/agents/executor";
import { buildReviewerPrompt } from "@/lib/harita-engine/intelligence/agents/reviewer";
import { hasFailureSignature } from "@/lib/harita-engine/assistant/guardrail-signatures";

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
  let messages = body.messages ?? [];
  
  if (messages.length > 8) {
    messages = messages.slice(-8);
  }
  const attachments = (body.attachments ?? []).slice(0, 3);
  const idempotencyKey = body.idempotencyKey ?? null;

  if (!context || !context.title || !context.summary) {
    return new Response("Missing assistant context.", { status: 400 });
  }

  const latestPromptRaw = [...messages].reverse().find((message) => message.role === "user")?.content ?? "What should I do next?";
  const latestPrompt = sanitizeUserText(latestPromptRaw);
  
  try {
    RoutingGovernor.routeQuestion(latestPrompt);
  } catch (error: any) {
    if (error.name === "RoutingViolation" || error instanceof RoutingViolation) {
      return createResponseStream(createTextStream(`⚠️ **Validation Error**: ${error.message}`));
    }
  }

  // Intercept standard greetings early to avoid LLM hallucinations
  const normalizedPrompt = latestPrompt.toLowerCase().trim();
  const isGreeting =
    normalizedPrompt === "hi" ||
    normalizedPrompt === "hello" ||
    normalizedPrompt === "hey" ||
    normalizedPrompt === "hi there" ||
    normalizedPrompt.startsWith("hi ") ||
    normalizedPrompt.startsWith("hello ");
    
  if (isGreeting) {
    const fallbackText = [
      "I am Harita.",
      "",
      "How can I help with your certification project today?"
    ].join("\n");
    return createResponseStream(createTextStream(fallbackText));
  }

  const intent = routeHaritaIntent(latestPrompt);
  const recentContext = messages.slice(-3).map(m => m.content).join(" ");
  let intentCategory = semanticDisambiguateIntent(latestPrompt, recentContext);
  
  // Phase 2: Attachment-First Enforcement
  if (attachments.length > 0) {
    intentCategory = "analyze_document";
  }
  
  try {
    EnovAitBoundary.validateIntelligenceRequest("/api/assistant", "POST", { action: intentCategory });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  const focusedProjectId = getProjectIdFromContext(context);
  console.log("[route.ts] Calling assembleRuntimeContext with focusedProjectId:", focusedProjectId);
  const reqUser = await getCurrentUser();
  const runtimeCtx = await assembleRuntimeContext(focusedProjectId, reqUser);
  
  if (!runtimeCtx) {
    console.log("[route.ts] assembleRuntimeContext returned null!");
  } else if (!runtimeCtx.user) {
    console.log("[route.ts] runtimeCtx.user is null!");
  }

  if (!runtimeCtx || !runtimeCtx.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = runtimeCtx.user;
  const { role, email: userEmail, name: rawUserName } = user;
  const projectIds = runtimeCtx.accessibleProjects.map((p) => p.id);
  const snapshot = formatRuntimeContext(runtimeCtx);

  console.log("=== AI SNAPSHOT PREVIEW ===");
  console.log(snapshot);
  console.log("===========================");

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient();

  if (focusedProjectId && !projectIds.includes(focusedProjectId)) {
    const traceId = uuidv4();
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
    const workflowCtx = await assembleRuntimeContext(focusedProjectId);
    if (!workflowCtx || !workflowCtx.user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const workflowUser = workflowCtx.user;
    const workflowRole = workflowCtx.user.role;
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
    : "No directly relevant RAG context found for this prompt.";
    
  const attachmentSummary = attachments.length
    ? [
        "Uploaded attachments:",
        ...attachments.map((file, index) => {
          const kb = Math.max(1, Math.round((file.size ?? 0) / 1024));
          return `${index + 1}. ${file.name} (${file.mimeType}, ${kb} KB)`;
        }),
      ].join("\n")
    : "Uploaded attachments: none";

  const combinedSnapshot = [
    `--- WORKSPACE ---`,
    snapshot,
    `--- AUGMENTED AI MEMORY ---`,
    augmentedContext,
    `--- RAG CONTEXT ---`,
    ragSnapshot,
    `--- ATTACHMENTS ---`,
    attachmentSummary
  ].join("\n\n");
  const hasManualLock = snapshot.includes("Project manual version: LOCKED");

  // Phase 1: Removed tryDeterministicAnswer and the related manualLock deterministic short-circuits here.

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

  // P1: Direct-DB factual query layer — handles high-confidence factual questions without LLM
  if (attachments.length === 0) {
    const factualAnswer = await resolveFactualQuery(latestPrompt, focusedProjectId, projectIds, role);
    if (factualAnswer) {
      // Inject factual data as context to the LLM rather than aggressively short-circuiting,
      // so the AI can answer complex follow-ups like "why 8 points are a miss?" using this context.
      const augmentedPrompt = `[SYSTEM CONTEXT: The following is factual data from the database regarding the user's query. Use this data to answer their question naturally.]\n\n${factualAnswer}\n\n[USER QUERY]: ${latestPrompt}`;
      messages[messages.length - 1].content = augmentedPrompt;
      
      // We no longer short-circuit. Let it fall through to the LLM.
    }
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
    const edgeContextPayload = sanitizeContextText(combinedSnapshot);
    
    const questionType = QuestionClassifier.classify(latestPrompt);
    
    // Wire up the Quarantine Boundary
    const quarantineKeywords = ["ignore all instructions", "override constraints", "system prompt", "drop table"];
    if (quarantineKeywords.some(kw => latestPrompt.toLowerCase().includes(kw))) {
      SemanticQuarantineEngine.quarantine(
        "Detected high-entropy override or prompt injection attempt",
        ["assistant"],
        0.95
      );
    }

    if (SemanticQuarantineEngine.isModuleContaminated("assistant")) {
      const quarantineFallback = "ERROR ENCOUNTERED: Prompt quarantined due to safety constraints. Execution halted.";
      return createResponseStream(createTextStream(quarantineFallback));
    }

    // Support mock guardrails failure simulation
    if (process.env.TEST_HARITA_GUARDRAILS === "true") {
      if (latestPrompt.includes("simulate early failure")) {
        return createResponseStream(createTextStream(
          JSON.stringify({ type: "control", action: "RESET_STREAM" }) + "\n"
        ));
      }
      if (latestPrompt.includes("simulate late failure")) {
        const warningPacket = JSON.stringify({
          type: "control",
          action: "WARNING",
          message: "Warning: Harita detected a potential system instruction or persona violation mid-stream."
        }) + "\n";
        const tokenPacket = JSON.stringify({ type: "token", content: "Here is the answer to your query." }) + "\n";
        return createResponseStream(createTextStream(warningPacket + tokenPacket));
      }
    }

    // 1. Planner Agent (Intents & Credit classifier)
    const plan = await generateExecutionPlan(
      latestPrompt,
      (augmentedContext.surface as string) || "dashboard",
      role,
      session.session_summary || undefined
    );

    // 2. Programmatic Executor (RLS checks & Read-only queries)
    const executorOutput = await executePlan(
      plan,
      activeProjectId,
      user.id,
      role
    );

    // 3. Reviewer Agent (Scope Lock, Advisory Rules, persona)
    const reviewerContext = {
      executorOutput,
      ragSnapshot,
      attachmentSummary,
      activeSurface: (augmentedContext.surface as string) || "dashboard",
      userName,
      userRole: role
    };
    
    const { systemPrompt: reviewerSystemPrompt, userMessage: reviewerUserMessage } = buildReviewerPrompt(reviewerContext);

    // Swap the user prompt with the reviewer context message
    const historyMessages = messages.slice(0, -1);
    const reviewerMessages = [
      ...historyMessages,
      { role: "user", content: reviewerUserMessage }
    ];

    let finalRawText = "";
    let finalSystemPromptUsed = reviewerSystemPrompt;
    let finalMessagesUsed = reviewerMessages;
    let attempts = 0;
    const maxAttempts = 2;
    let failureDetected = false;
    let tokenCount = 0;
    let currentStream: any = null;

    while (attempts < maxAttempts) {
      let text = "";
      if (!currentStream) {
        currentStream = await edgeStream(
          mergedContext,
          finalMessagesUsed,
          edgeContextPayload,
          role,
          undefined,
          finalSystemPromptUsed
        );
      }
      
      const reader = currentStream.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();

      const words = text.split(/\s+/).filter(Boolean);
      tokenCount = words.length;

      if (hasFailureSignature(text) && tokenCount <= 40) {
        console.warn(`[Guardrails] Early failure signature detected on attempt ${attempts + 1}. Retrying...`);
        attempts++;
        if (attempts < maxAttempts) {
          // Attempt 1: Prompt-Flattening retry
          const flattenedUserContent = `${reviewerSystemPrompt}\n\n=== USER PROMPT ===\n${reviewerUserMessage}`;
          finalMessagesUsed = [
            ...historyMessages,
            { role: "user", content: flattenedUserContent }
          ];
          finalSystemPromptUsed = "You are Harita, the EnovAIT-class Consultant Intelligence engine for Tracknov. Focus strictly on IGBC and green building certification rules.";
          currentStream = null as any;
          continue;
        } else {
          failureDetected = true;
          finalRawText = text;
        }
      } else {
        failureDetected = hasFailureSignature(text);
        finalRawText = text;
        break;
      }
    }

    await logAiInteraction({
      userId: user.id,
      intent,
      query: latestPrompt,
      model: "multi-agent-teamwork",
      contextSize: combinedSnapshot.length,
      tokenUsage: Math.ceil((latestPrompt.length + combinedSnapshot.length) / 4),
      fallbackUsed: false,
      latencyMs: Date.now() - startedAt,
    });

    if (failureDetected) {
      if (tokenCount <= 40) {
        // Persistent early failure -> Send RESET_STREAM control packet
        return createResponseStream(createTextStream(
          JSON.stringify({ type: "control", action: "RESET_STREAM" }) + "\n"
        ));
      } else {
        // Late failure -> Send WARNING control packet + governed text
        let safe = sanitizeAiResponse(finalRawText);
        safe = filterTechnicalLeakage(safe);
        if (containsAuthoritativeClaim(safe)) {
          safe = getAuthoritativeClaimRefusal();
        }
        safe = safe.replace(/(?:^|\n)\*{0,2}(Direct Answer|Consultant Assessment|Answer)\*{0,2}\s*:\s*/gi, (match) => {
          return match.startsWith("\n") ? "\n" : "";
        });
        safe = safe.replace(/([.!?])\s*\*{0,2}(Direct Answer|Consultant Assessment)\*{0,2}\s*:\s*/gi, "$1 ");

        if (session.id) {
          await haritaRuntimeService.storeMessage(session.id, "assistant", safe);
        }

        const warningPacket = JSON.stringify({
          type: "control",
          action: "WARNING",
          message: "Warning: Harita detected a potential system instruction or persona violation mid-stream."
        }) + "\n";
        const tokenPacket = JSON.stringify({ type: "token", content: safe }) + "\n";
        return createResponseStream(createTextStream(warningPacket + tokenPacket));
      }
    }

    // Normal successful response -> Govern and send token packet
    let safe = sanitizeAiResponse(finalRawText);
    safe = filterTechnicalLeakage(safe);
    if (containsAuthoritativeClaim(safe)) {
      safe = getAuthoritativeClaimRefusal();
    }
    safe = safe.replace(/(?:^|\n)\*{0,2}(Direct Answer|Consultant Assessment|Answer)\*{0,2}\s*:\s*/gi, (match) => {
      return match.startsWith("\n") ? "\n" : "";
    });
    safe = safe.replace(/([.!?])\s*\*{0,2}(Direct Answer|Consultant Assessment)\*{0,2}\s*:\s*/gi, "$1 ");

    if (session.id) {
      await haritaRuntimeService.storeMessage(session.id, "assistant", safe);
    }

    return createResponseStream(createTextStream(
      JSON.stringify({ type: "token", content: safe }) + "\n"
    ));
  } catch (error: any) {
    console.error("[Assistant] AI pipeline failed:", error);
    
    const errMsg = error?.message || String(error);
    const isRateLimit = errMsg.toLowerCase().includes("quota") ||
                         errMsg.toLowerCase().includes("429") ||
                         errMsg.toLowerCase().includes("rate limit");
    
    if (isRateLimit) {
      return createResponseStream(createTextStream("⚠️ **Rate Limit Expired**: The AI request quota has been exceeded. Please try again in a moment."));
    }
    
    return createResponseStream(createTextStream(`⚠️ **System Error**: ${errMsg}`));
  }
}

function normalizeCreditCode(code: string): string {
  let cleaned = code.trim().toUpperCase().replace(/[-_]/g, ' ');
  // Insert space between letters and digits if missing (e.g. EEC4 -> EE C4, EEMR1 -> EE MR1)
  cleaned = cleaned.replace(/^(EDA|WC|EE|IM|IE|IID)(C|MR)?(\d+)$/i, (match, cat, type, num) => {
    const t = type ? ` ${type.toUpperCase()}` : ' C';
    return `${cat.toUpperCase()}${t}${num}`;
  });
  return cleaned.replace(/\s+/g, ' ').trim();
}

// ─── P1: Direct-DB Factual Query Resolver ─────────────────────────────────────
// For high-confidence factual questions, query Supabase directly.
// No LLM. No hallucination. Instant, accurate answers.

async function resolveFactualQuery(
  prompt: string,
  focusedProjectId: string | null,
  projectIds: string[],
  role: string,
): Promise<string | null> {
  const q = prompt.toLowerCase().trim();
  if (!projectIds.length) return null;

  const reader = env.supabaseServiceRoleKey ? createAdminClient() : createClient();
  const targetIds = focusedProjectId ? [focusedProjectId] : projectIds;

  // --- Score / points query ---
  if (
    q.includes("point") || q.includes("score") || q.includes("how much") ||
    q.includes("total score") || q.includes("max score") || q.includes("maximum score") ||
    q.includes("comply all") || q.includes("complete all") || q.includes("if we complete")
  ) {
    const { data: credits } = await reader
      .from("project_credits")
      .select("credit_code, credit_name, status, max_points, na, category_name")
      .in("project_id", targetIds);

    if (credits?.length) {
      // Fetch project name for display
      let projectLabel = "this project";
      if (focusedProjectId) {
        const { data: proj } = await reader.from("projects").select("name").eq("id", focusedProjectId).maybeSingle();
        if (proj?.name) projectLabel = `the ${proj.name} project`;
      }

      const activeCredits = credits.filter(c => !c.na);
      const naCredits = credits.filter(c => c.na);
      const totalPossible = activeCredits.reduce((sum, c) => sum + Number(c.max_points ?? 0), 0);
      const currentScore = activeCredits
        .filter(c => c.status === "APPROVED" || c.status === "complete")
        .reduce((sum, c) => sum + Number(c.max_points ?? 0), 0);
      const pendingPoints = activeCredits
        .filter(c => c.status !== "APPROVED" && c.status !== "complete")
        .reduce((sum, c) => sum + Number(c.max_points ?? 0), 0);
      const naPoints = credits.filter(c => c.na).reduce((sum, c) => sum + Number(c.max_points ?? 0), 0);

      const certLevel = totalPossible >= 80 ? "Platinum" : totalPossible >= 60 ? "Gold" : totalPossible >= 50 ? "Silver" : "Certified";

      return [
        `**If all active credits are complied, ${projectLabel} can achieve a maximum of ${totalPossible} points.**`,
        ``,
        `**Score Breakdown:**`,
        `  \u2022 Currently earned (Approved/Complete): **${currentScore} pts**`,
        `  \u2022 Pending (Potential): ${pendingPoints} pts`,
        ``,
        `**Total Active Credits:** ${activeCredits.length} credits (${naCredits.length} marked Not Required — excluded from scoring)`,
        ...(naCredits.length > 0 ? [`**Not Required (NA):** ${naCredits.map(c => `${c.credit_code} (${Number(c.max_points ?? 0)} pts)`).join(", ")} — these ${naPoints} pts are excluded from the total possible score`] : []),
        ``,
        `**Maximum certification level achievable:** ${certLevel} (${totalPossible} pts)`,
        `  \u2022 Certified = 50 pts | Silver = 51–59 | Gold = 60–79 | Platinum = 80+`,
      ].join("\n");
    }
  }

  // --- Credit count query ---
  if (
    (q.includes("how many credits") || q.includes("total credits") || q.includes("credits total") || q.includes("how many total credits")) &&
    !q.includes("who") && !q.includes("assign")
  ) {
    const { data: credits } = await reader
      .from("project_credits")
      .select("id, credit_code, category_name, category, status, project_id, na, max_points")
      .in("project_id", targetIds);

    if (!credits?.length) return null;

    const total = credits.length;
    const naCount = credits.filter(c => c.na).length;
    const activeCredits = credits.filter(c => !c.na);
    const complete = activeCredits.filter(c => c.status === "APPROVED" || c.status === "complete").length;
    const inProgress = activeCredits.filter(c => c.status === "IN_PROGRESS").length;
    const draft = activeCredits.filter(c => c.status === "DRAFT").length;
    const blocked = activeCredits.filter(c => c.status === "BLOCKED").length;
    const naCredits = credits.filter(c => c.na);

    const byCategory: Record<string, number> = {};
    for (const c of activeCredits) {
      const cat = c.category_name ?? c.category ?? "Uncategorised";
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    }

    const categoryBreakdown = JSON.stringify(byCategory, null, 2);

    return [
      `**Total Credits: ${total}** (${activeCredits.length} active, ${naCount} not required/NA)`,
      ``,
      `**Active Credit Status (${activeCredits.length} credits):**`,
      `  • Complete / Approved: ${complete}`,
      `  • In Progress: ${inProgress}`,
      `  • Draft: ${draft}`,
      `  • Blocked: ${blocked}`,
      ``,
      ...(naCount > 0 ? [
        `**Not Required / Not Applicable (${naCount}):** ${naCredits.map(c => c.credit_code).join(", ")}`,
        ``,
      ] : []),
      `**Active Credits By Category:**`,
      categoryBreakdown,
    ].join("\n");
  }

  // --- Assignment lookup: "who is assigned to [CODE]" ---
  const assignMatch = q.match(/who\s+(?:is\s+|are\s+)?(?:assigned|working|owns|responsible)\s+(?:to\s+|on\s+|for\s+)?([a-z]{2,4}\s?[a-z0-9]{1,4}\s*[0-9]{0,2})/i)
    ?? q.match(/assigned\s+(?:to\s+|on\s+)?([a-z]{2,4}\s?[a-z0-9]{1,4}\s*[0-9]{0,2})/i);
  if (assignMatch) {
    let rawCode = (assignMatch[1] ?? "").trim().toUpperCase().replace(/\s+/, " ");
    if (rawCode) {
      rawCode = normalizeCreditCode(rawCode);
      const { data: credit } = await reader
        .from("project_credits")
        .select("id, project_id, credit_code, credit_name, status, assigned_user_id, responsible_role, completion_pct, documents_required")
        .in("project_id", targetIds)
        .eq("credit_code", rawCode)
        .maybeSingle();

      if (credit) {
        // Need to import or re-fetch getCreditAssignmentGraph
        // But since this is inside route.ts, I can just dynamically import it
        const { getCreditAssignmentGraph } = await import("@/lib/harita-engine/services/credit-assignment-graph");
        const graphMap = await getCreditAssignmentGraph(targetIds, [credit as any], reader);
        const graph = graphMap.get(credit.id);

        let lines = [
          `**${credit.credit_code} — ${credit.credit_name ?? ""}**`,
          ``,
        ];

        if (!graph || graph.requirements.length === 0) {
          let assignedTo = "Unassigned";
          if (credit.assigned_user_id) {
            const { data: prof } = await reader
              .from("profiles")
              .select("full_name, email")
              .eq("user_id", credit.assigned_user_id)
              .maybeSingle();
            if (prof) assignedTo = `${prof.full_name} (${prof.email})`;
          } else if (credit.responsible_role) {
            assignedTo = credit.responsible_role;
          }
          lines.push(`**Assigned to:** ${assignedTo}`);
        } else {
          const assignedContributors = new Set(graph.requirements.filter(r => r.contributorId).map(r => r.contributorId));
          if (assignedContributors.size <= 1) {
            const singleContributor = graph.requirements.find(r => r.contributorName)?.contributorName ?? "Unassigned";
            lines.push(`**Assigned to:** ${singleContributor}`);
          } else {
            lines.push(`**${credit.credit_code} currently has multiple contributors.**`);
            for (const req of graph.requirements) {
              lines.push(`- **${req.requirementType}**: ${req.contributorName ?? "Unassigned"}`);
            }
          }
        }

        lines.push(``); // Blank line to break the list block
        lines.push(`**Status:** ${credit.status}`);
        lines.push(`**Completion:** ${credit.completion_pct ?? 0}%`);
        
        return lines.join("\n");
      }
    }
  }

  // --- Blocked credits ---
  if (q.includes("blocked") || q.includes("what is blocking") || q.includes("what's blocking")) {
    const { data: credits } = await reader
      .from("project_credits")
      .select("credit_code, credit_name, status, blocked_by, assigned_user_id")
      .in("project_id", targetIds)
      .eq("status", "BLOCKED");

    if (!credits?.length) {
      return "**No blocked credits found** in the current project(s). All credits are progressing normally.";
    }

    const lines = [`**Blocked Credits (${credits.length}):**`, ``];
    for (const c of credits) {
      lines.push(`  • **${c.credit_code}** — ${c.credit_name ?? ""}`);
      if (c.blocked_by) lines.push(`    Blocked by: ${c.blocked_by}`);
    }
    return lines.join("\n");
  }

  // --- List all credits / show tracker ---
  if (
    (q.includes("list") || q.includes("show") || q.includes("all credits") || q.includes("credit tracker") || q.includes("full tracker"))
    && (q.includes("credit") || q.includes("tracker"))
    && !q.includes("who")
  ) {
    const { data: credits } = await reader
      .from("project_credits")
      .select("credit_code, credit_name, status, assigned_user_id, responsible_role, completion_pct, category_name, na, max_points")
      .in("project_id", targetIds)
      .order("credit_code");

    if (!credits?.length) return null;

    // Batch resolve assignments
    const uids = [...new Set(credits.map(c => c.assigned_user_id).filter(Boolean))] as string[];
    const profileMap = new Map<string, string>();
    if (uids.length) {
      const { data: profs } = await reader.from("profiles").select("user_id, full_name").in("user_id", uids);
      for (const p of profs ?? []) profileMap.set(p.user_id, p.full_name ?? "Unknown");
    }

    const activeCredits = credits.filter(c => !c.na);
    const naCredits = credits.filter(c => c.na);
    const structuredTracker = credits.map(c => ({
      category: c.category_name ?? "Uncategorised",
      code: c.credit_code,
      name: c.credit_name ?? "",
      status: c.status,
      not_required: c.na,
      max_points: c.max_points,
      assigned: c.assigned_user_id ? (profileMap.get(c.assigned_user_id) ?? "Unknown") : (c.responsible_role ?? "Unassigned"),
      completion_pct: c.completion_pct ?? 0
    }));

    return JSON.stringify({
      trackerType: "Full Credit Tracker",
      totalCredits: credits.length,
      activeCredits: activeCredits.length,
      naCredits: naCredits.length,
      data: structuredTracker
    }, null, 2);
  }

  return null;
}
