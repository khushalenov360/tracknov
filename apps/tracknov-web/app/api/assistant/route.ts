import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildFallbackAssistantReply,
  type AssistantContext,
} from "@tracknov/harita-engine/assistant";
import { ragService } from "@tracknov/harita-engine/services/rag-service";
import { toneService, type AssistantTone } from "@tracknov/harita-engine/services/tone-service";
import { knowledgeEngine } from "@tracknov/harita-engine/services/knowledge-engine";
import {
  getUnknownDataResponse,
  normalizeHaritaResponse,
  requiresExplicitConfirmationForExecution,
  routeHaritaIntent,
  semanticDisambiguateIntent,
  requiresToolCall,
  sanitizeContextText,
  sanitizeUserText,
} from "@tracknov/harita-engine/services/harita-governance";
import { EnovAitBoundary } from "@tracknov/core/api/enovaitApiBoundary";
import { checkRateLimit } from "@tracknov/harita-engine/security/rate-limit";
import { executeTool } from "@tracknov/harita-engine/assistant-tools";
import { getSafeCapabilitiesContext } from "@tracknov/harita-engine/services/capability-registry";
import { executeIntent } from "@/ai/orchestrator/execute-intent";
import { haritaRuntimeService } from "@tracknov/harita-engine/services/harita-runtime-service";
import { SemanticQuarantineEngine } from "@tracknov/harita-engine/governance/semanticQuarantineEngine";
import { createAiStream as edgeStream } from "@tracknov/harita-engine/assistant/llm-streamer";

import { type AssistantRequest, createTextStream, createResponseStream } from "@tracknov/harita-engine/assistant/stream-utils";
import { getWorkspaceSnapshot } from "@tracknov/harita-engine/assistant/snapshot";
import { isFileQuestion, isUploadMappingIntent, buildAttachmentAnalysisReply, getProjectIdFromContext } from "@tracknov/harita-engine/assistant/attachments";
import { applyResponseGovernance, logAiInteraction, tryDeterministicAnswer } from "@tracknov/harita-engine/assistant/governance-filters";
import { tryDetectFunctionCalls } from "@tracknov/harita-engine/assistant/ai-providers";

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
  const { user, role, snapshot, projectIds, userEmail, userName: rawUserName } = await getWorkspaceSnapshot();

  console.log("=== AI SNAPSHOT PREVIEW ===");
  console.log(snapshot);
  console.log("===========================");

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

  // P1: Direct-DB factual query layer — answers structured questions without LLM
  if (attachments.length === 0) {
    const factualAnswer = await resolveFactualQuery(latestPrompt, focusedProjectId, projectIds, role);
    if (factualAnswer) {
      await logAiInteraction({
        userId: user.id,
        intent: "factual_db_query",
        query: latestPrompt,
        model: "deterministic-db",
        contextSize: 0,
        tokenUsage: 0,
        fallbackUsed: false,
        latencyMs: Date.now() - startedAt,
      });
      return createResponseStream(createTextStream(factualAnswer));
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
  } catch (error: any) {
    console.error("[Assistant] AI pipeline failed:", error);
    const fallbackText = `ERROR ENCOUNTERED: ${error?.message || String(error)}\n\n` + buildFallbackAssistantReply(context, latestPrompt);
    return createResponseStream(createTextStream(fallbackText));
  }
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

  // --- Credit count query ---
  if (
    (q.includes("how many credits") || q.includes("total credits") || q.includes("credits total") || q.includes("how many total credits")) &&
    !q.includes("who") && !q.includes("assign")
  ) {
    const { data: credits } = await reader
      .from("project_credits")
      .select("id, credit_code, category_name, category, status, project_id")
      .in("project_id", targetIds);

    if (!credits?.length) return null;

    const total = credits.length;
    const complete = credits.filter(c => c.status === "APPROVED" || c.status === "complete").length;
    const inProgress = credits.filter(c => c.status === "IN_PROGRESS").length;
    const draft = credits.filter(c => c.status === "DRAFT").length;
    const blocked = credits.filter(c => c.status === "BLOCKED").length;

    const byCategory = new Map<string, number>();
    for (const c of credits) {
      const cat = c.category_name ?? c.category ?? "Uncategorised";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
    }

    const categoryBreakdown = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `  • ${cat}: ${count}`)
      .join("\n");

    return [
      `**Total Credits: ${total}**`,
      ``,
      `**By Status:**`,
      `  • Complete / Approved: ${complete}`,
      `  • In Progress: ${inProgress}`,
      `  • Draft: ${draft}`,
      `  • Blocked: ${blocked}`,
      ``,
      `**By Category:**`,
      categoryBreakdown,
    ].join("\n");
  }

  // --- Assignment lookup: "who is assigned to [CODE]" ---
  const assignMatch = q.match(/who.*(assigned|working|owns|responsible).*(to|on|for)?\s+([a-z]{2,4}\s?[a-z0-9]{1,4}\s*[0-9]{0,2})/i)
    ?? q.match(/assigned.*(to|on)?\s+([a-z]{2,4}\s?[a-z0-9]{1,4}\s*[0-9]{0,2})/i);
  if (assignMatch) {
    const rawCode = (assignMatch[3] ?? assignMatch[2] ?? "").trim().toUpperCase().replace(/\s+/, " ");
    if (rawCode) {
      const { data: credit } = await reader
        .from("project_credits")
        .select("id, project_id, credit_code, credit_name, status, assigned_user_id, responsible_role, completion_pct, documents_required")
        .in("project_id", targetIds)
        .ilike("credit_code", `%${rawCode}%`)
        .maybeSingle();

      if (credit) {
        // Need to import or re-fetch getCreditAssignmentGraph
        // But since this is inside route.ts, I can just dynamically import it
        const { getCreditAssignmentGraph } = await import("@tracknov/harita-engine/services/credit-assignment-graph");
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
      .select("credit_code, credit_name, status, assigned_user_id, responsible_role, completion_pct, category_name")
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

    const lines = [`**Full Credit Tracker (${credits.length} credits):**`, ``];
    let lastCat = "";
    for (const c of credits) {
      const cat = c.category_name ?? "Uncategorised";
      if (cat !== lastCat) {
        lines.push(``, `**${cat}**`);
        lastCat = cat;
      }
      const assigned = c.assigned_user_id
        ? (profileMap.get(c.assigned_user_id) ?? "Unknown")
        : (c.responsible_role ?? "Unassigned");
      lines.push(`  • ${c.credit_code} | ${c.credit_name ?? ""} | ${c.status} | ${assigned} | ${c.completion_pct ?? 0}%`);
    }
    return lines.join("\n");
  }

  return null;
}
