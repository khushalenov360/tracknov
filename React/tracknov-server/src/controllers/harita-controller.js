"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const uuid_1 = require("uuid");
const env_1 = require("@/lib/env");
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
const rag_service_1 = require("@/lib/harita-engine/services/rag-service");
const tone_service_1 = require("@/lib/harita-engine/services/tone-service");
const knowledge_engine_1 = require("@/lib/harita-engine/services/knowledge-engine");
const harita_governance_1 = require("@/lib/harita-engine/services/harita-governance");
const enovaitApiBoundary_1 = require("@/lib/core/api/enovaitApiBoundary");
const rate_limit_1 = require("@/lib/harita-engine/security/rate-limit");
const capability_registry_1 = require("@/lib/harita-engine/services/capability-registry");
const execute_intent_1 = require("@/ai/orchestrator/execute-intent");
const harita_runtime_service_1 = require("@/lib/harita-engine/services/harita-runtime-service");
const semanticQuarantineEngine_1 = require("@/lib/harita-engine/governance/semanticQuarantineEngine");
const llm_streamer_1 = require("@/lib/harita-engine/assistant/llm-streamer");
const question_classifier_1 = require("@/lib/harita-engine/intelligence/reasoning/question-classifier");
const routing_governor_1 = require("@/lib/harita-engine/runtime/routing-governor");
const entity_validator_1 = require("@/lib/harita-engine/runtime/entity-validator");
const stream_utils_1 = require("@/lib/harita-engine/assistant/stream-utils");
const runtime_context_assembler_1 = require("@/lib/harita-engine/lib/runtime/runtime-context-assembler");
const attachments_1 = require("@/lib/harita-engine/assistant/attachments");
const governance_filters_1 = require("@/lib/harita-engine/assistant/governance-filters");
const data_1 = require("@/lib/data");
const planner_1 = require("@/lib/harita-engine/intelligence/agents/planner");
const executor_1 = require("@/lib/harita-engine/intelligence/agents/executor");
const reviewer_1 = require("@/lib/harita-engine/intelligence/agents/reviewer");
const guardrail_signatures_1 = require("@/lib/harita-engine/assistant/guardrail-signatures");
exports.dynamic = "force-dynamic";
function POST(request) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const throttled = (0, rate_limit_1.checkRateLimit)(request, {
            key: "api:assistant:chat",
            limit: 40,
            windowMs: 60000,
        });
        if (throttled)
            return throttled;
        const startedAt = Date.now();
        let body;
        try {
            body = (yield request.json());
        }
        catch (_j) {
            return new Response("Invalid request body.", { status: 400 });
        }
        const context = body.context;
        let messages = (_a = body.messages) !== null && _a !== void 0 ? _a : [];
        if (messages.length > 8) {
            messages = messages.slice(-8);
        }
        const attachments = ((_b = body.attachments) !== null && _b !== void 0 ? _b : []).slice(0, 3);
        const idempotencyKey = (_c = body.idempotencyKey) !== null && _c !== void 0 ? _c : null;
        if (!context || !context.title || !context.summary) {
            return new Response("Missing assistant context.", { status: 400 });
        }
        const latestPromptRaw = (_e = (_d = [...messages].reverse().find((message) => message.role === "user")) === null || _d === void 0 ? void 0 : _d.content) !== null && _e !== void 0 ? _e : "What should I do next?";
        const latestPrompt = (0, harita_governance_1.sanitizeUserText)(latestPromptRaw);
        try {
            routing_governor_1.RoutingGovernor.routeQuestion(latestPrompt);
        }
        catch (error) {
            if (error.name === "RoutingViolation" || error instanceof entity_validator_1.RoutingViolation) {
                return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)(`⚠️ **Validation Error**: ${error.message}`));
            }
        }
        // Intercept standard greetings early to avoid LLM hallucinations
        const normalizedPrompt = latestPrompt.toLowerCase().trim();
        const isGreeting = normalizedPrompt === "hi" ||
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
            return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)(fallbackText));
        }
        const intent = (0, harita_governance_1.routeHaritaIntent)(latestPrompt);
        const recentContext = messages.slice(-3).map(m => m.content).join(" ");
        let intentCategory = (0, harita_governance_1.semanticDisambiguateIntent)(latestPrompt, recentContext);
        // Phase 2: Attachment-First Enforcement
        if (attachments.length > 0) {
            intentCategory = "analyze_document";
        }
        try {
            enovaitApiBoundary_1.EnovAitBoundary.validateIntelligenceRequest("/api/assistant", "POST", { action: intentCategory });
        }
        catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 403, headers: { "Content-Type": "application/json" } });
        }
        const focusedProjectId = (0, attachments_1.getProjectIdFromContext)(context);
        console.log("[route.ts] Calling assembleRuntimeContext with focusedProjectId:", focusedProjectId);
        const reqUser = yield (0, data_1.getCurrentUser)();
        const runtimeCtx = yield (0, runtime_context_assembler_1.assembleRuntimeContext)(focusedProjectId, reqUser);
        if (!runtimeCtx) {
            console.log("[route.ts] assembleRuntimeContext returned null!");
        }
        else if (!runtimeCtx.user) {
            console.log("[route.ts] runtimeCtx.user is null!");
        }
        if (!runtimeCtx || !runtimeCtx.user) {
            return new Response("Unauthorized", { status: 401 });
        }
        const user = runtimeCtx.user;
        const { role, email: userEmail, name: rawUserName } = user;
        const projectIds = runtimeCtx.accessibleProjects.map((p) => p.id);
        const snapshot = (0, runtime_context_assembler_1.formatRuntimeContext)(runtimeCtx);
        console.log("=== AI SNAPSHOT PREVIEW ===");
        console.log(snapshot);
        console.log("===========================");
        if (!user) {
            return new Response("Unauthorized", { status: 401 });
        }
        const supabase = (0, server_1.createClient)();
        if (focusedProjectId && !projectIds.includes(focusedProjectId)) {
            const traceId = (0, uuid_1.v4)();
            yield supabase.from("security_events").insert({
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
            return new Response(JSON.stringify({
                error: "ACCESS DENIED",
                status: 403,
                message: "Requested project context violates multi-tenant isolation boundaries. Access strictly denied.",
                security_trace_captured: true,
            }), { status: 403, headers: { "Content-Type": "application/json" } });
        }
        if (intentCategory === "workflow_action" && focusedProjectId) {
            const workflowCtx = yield (0, runtime_context_assembler_1.assembleRuntimeContext)(focusedProjectId);
            if (!workflowCtx || !workflowCtx.user) {
                return new Response("Unauthorized", { status: 401 });
            }
            const workflowUser = workflowCtx.user;
            const workflowRole = workflowCtx.user.role;
            const intentResult = yield (0, execute_intent_1.executeIntent)({
                userId: workflowUser.id,
                role: workflowRole,
                projectContext: {
                    projectId: focusedProjectId,
                    projectName: (_f = context.title) !== null && _f !== void 0 ? _f : null,
                },
                query: latestPrompt,
            });
            return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)(intentResult.message));
        }
        const userName = rawUserName || (userEmail === null || userEmail === void 0 ? void 0 : userEmail.split("@")[0]) || "there";
        const activeProjectId = focusedProjectId || projectIds[0];
        const session = yield harita_runtime_service_1.haritaRuntimeService.getOrCreateSession(user.id, activeProjectId);
        yield harita_runtime_service_1.haritaRuntimeService.storeMessage(session.id, "user", latestPrompt);
        const augmentedContext = yield harita_runtime_service_1.haritaRuntimeService.buildAugmentedContext(user.id, activeProjectId, context);
        const ragMatches = yield rag_service_1.ragService.retrieveContext({
            query: latestPrompt,
            projectIds: focusedProjectId ? [focusedProjectId] : projectIds !== null && projectIds !== void 0 ? projectIds : [],
            limit: 6,
        });
        const ragSnapshot = ragMatches.length
            ? ragMatches
                .map((item, index) => {
                var _a, _b, _c, _d;
                const source = String((_b = (_a = item.metadata) === null || _a === void 0 ? void 0 : _a.source) !== null && _b !== void 0 ? _b : "context");
                const code = String((_d = (_c = item.metadata) === null || _c === void 0 ? void 0 : _c.credit_code) !== null && _d !== void 0 ? _d : "");
                return `RAG ${index + 1} [${source}${code ? `/${code}` : ""}] score=${item.score.toFixed(3)}: ${item.content}`;
            })
                .join("\n")
            : "No directly relevant RAG context found for this prompt.";
        const attachmentSummary = attachments.length
            ? [
                "Uploaded attachments:",
                ...attachments.map((file, index) => {
                    var _a;
                    const kb = Math.max(1, Math.round(((_a = file.size) !== null && _a !== void 0 ? _a : 0) / 1024));
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
        let resolvedTone;
        if (body.tone) {
            resolvedTone = body.tone === "Guided" ? "Operator" : (body.tone === "Fast" ? "Power" : "Executive");
        }
        else {
            resolvedTone = yield tone_service_1.toneService.getUserTone(user.id, role);
        }
        if ((0, attachments_1.isFileQuestion)(latestPrompt) && attachments.length === 0) {
            const message = "No file is attached in this chat message. Please attach the file with the + button first.";
            yield (0, governance_filters_1.logAiInteraction)({
                userId: user.id,
                intent,
                query: latestPrompt,
                model: "deterministic",
                contextSize: combinedSnapshot.length,
                tokenUsage: 0,
                fallbackUsed: false,
                latencyMs: Date.now() - startedAt,
            });
            return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)(message));
        }
        // P1: Direct-DB factual query layer — handles high-confidence factual questions without LLM
        if (attachments.length === 0) {
            const factualAnswer = yield resolveFactualQuery(latestPrompt, focusedProjectId, projectIds, role);
            if (factualAnswer) {
                // Inject factual data as context to the LLM rather than aggressively short-circuiting,
                // so the AI can answer complex follow-ups like "why 8 points are a miss?" using this context.
                const augmentedPrompt = `[SYSTEM CONTEXT: The following is factual data from the database regarding the user's query. Use this data to answer their question naturally.]\n\n${factualAnswer}\n\n[USER QUERY]: ${latestPrompt}`;
                messages[messages.length - 1].content = augmentedPrompt;
                // We no longer short-circuit. Let it fall through to the LLM.
            }
        }
        const isAnalysisAttachmentFlow = Boolean(attachments === null || attachments === void 0 ? void 0 : attachments.length) &&
            !(0, attachments_1.isUploadMappingIntent)(latestPrompt !== null && latestPrompt !== void 0 ? latestPrompt : "", {
                analysisOnly: body.pickedIntent === "analysis",
                hasAttachments: true,
            });
        if (!isAnalysisAttachmentFlow && (0, harita_governance_1.requiresExplicitConfirmationForExecution)(latestPrompt)) {
            const confirmReply = "I can prepare this upload flow, but execution needs explicit confirmation. Please reply: 'Confirm upload this to <credit code> as <document type>' to proceed.";
            yield (0, governance_filters_1.logAiInteraction)({
                userId: user.id,
                intent,
                query: latestPrompt,
                model: "deterministic",
                contextSize: combinedSnapshot.length,
                tokenUsage: 0,
                fallbackUsed: false,
                latencyMs: Date.now() - startedAt,
            });
            return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)(confirmReply));
        }
        const AI_ENABLED = process.env.AI_ENABLED !== "false";
        if (!env_1.env.aiReady || !AI_ENABLED) {
            if (attachments.length > 0) {
                const file = attachments[0];
                const isAnalysisRequest = !(0, attachments_1.isUploadMappingIntent)(latestPrompt, { analysisOnly: body.pickedIntent === "analysis" }) || (0, attachments_1.isFileQuestion)(latestPrompt);
                const attachmentReply = isAnalysisRequest
                    ? (0, attachments_1.buildAttachmentAnalysisReply)(userName, file, ragMatches)
                    : [
                        `Hi ${userName}, I can see your attached file: ${file.name}.`,
                        "Tell me the credit code and document type you want, and I will prepare the workflow upload step.",
                    ].join("\n");
                yield (0, governance_filters_1.logAiInteraction)({
                    userId: user.id,
                    intent,
                    query: latestPrompt,
                    model: "fallback",
                    contextSize: combinedSnapshot.length,
                    tokenUsage: 0,
                    fallbackUsed: true,
                    latencyMs: Date.now() - startedAt,
                });
                return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)(attachmentReply));
            }
        }
        const toneInstructions = tone_service_1.toneService.getToneInstructions(resolvedTone);
        const capabilitiesContext = [
            (0, capability_registry_1.getSafeCapabilitiesContext)((_g = augmentedContext.surface) !== null && _g !== void 0 ? _g : "dashboard", role),
            knowledge_engine_1.knowledgeEngine.getPlatformRoadmapContext(),
            knowledge_engine_1.knowledgeEngine.getConstructionStageGateRules(),
        ].join("\n\n");
        const enrichedContext = Object.assign(Object.assign({}, augmentedContext), { capabilities: capabilitiesContext, facts: [
                ...augmentedContext.facts,
                `User: ${userName || userEmail || "Unknown"}`,
                `User email: ${userEmail}`,
                `Resolved role: ${role}`,
                `Current Tone: ${resolvedTone}`,
                "Responses must be grounded in the workspace snapshot attached in system instructions.",
            ] });
        const mergedContext = Object.assign(Object.assign({}, enrichedContext), { summary: context.summary + "\n\n" + toneInstructions });
        if (attachments.length > 0) {
            const lastUserIndex = (_h = [...messages]
                .map((message, index) => ({ message, index }))
                .reverse()
                .find((entry) => entry.message.role === "user")) === null || _h === void 0 ? void 0 : _h.index;
            if (typeof lastUserIndex === "number") {
                const attachmentNote = "\n\nAttached files for this question:\n" +
                    attachments
                        .map((file, index) => `- ${index + 1}. ${file.name} (${file.mimeType})`)
                        .join("\n") +
                    "\nUse these attachments with workspace context before answering.";
                messages[lastUserIndex] = Object.assign(Object.assign({}, messages[lastUserIndex]), { content: `${messages[lastUserIndex].content}${attachmentNote}` });
            }
        }
        try {
            const edgeContextPayload = (0, harita_governance_1.sanitizeContextText)(combinedSnapshot);
            const questionType = question_classifier_1.QuestionClassifier.classify(latestPrompt);
            // Wire up the Quarantine Boundary
            const quarantineKeywords = ["ignore all instructions", "override constraints", "system prompt", "drop table"];
            if (quarantineKeywords.some(kw => latestPrompt.toLowerCase().includes(kw))) {
                semanticQuarantineEngine_1.SemanticQuarantineEngine.quarantine("Detected high-entropy override or prompt injection attempt", ["assistant"], 0.95);
            }
            if (semanticQuarantineEngine_1.SemanticQuarantineEngine.isModuleContaminated("assistant")) {
                const quarantineFallback = "ERROR ENCOUNTERED: Prompt quarantined due to safety constraints. Execution halted.";
                return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)(quarantineFallback));
            }
            // Support mock guardrails failure simulation
            if (process.env.TEST_HARITA_GUARDRAILS === "true") {
                if (latestPrompt.includes("simulate early failure")) {
                    return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)(JSON.stringify({ type: "control", action: "RESET_STREAM" }) + "\n"));
                }
                if (latestPrompt.includes("simulate late failure")) {
                    const warningPacket = JSON.stringify({
                        type: "control",
                        action: "WARNING",
                        message: "Warning: Harita detected a potential system instruction or persona violation mid-stream."
                    }) + "\n";
                    const tokenPacket = JSON.stringify({ type: "token", content: "Here is the answer to your query." }) + "\n";
                    return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)(warningPacket + tokenPacket));
                }
            }
            // 1. Planner Agent (Intents & Credit classifier)
            const plan = yield (0, planner_1.generateExecutionPlan)(latestPrompt, augmentedContext.surface || "dashboard", role, session.session_summary || undefined);
            // 2. Programmatic Executor (RLS checks & Read-only queries)
            const executorOutput = yield (0, executor_1.executePlan)(plan, activeProjectId, user.id, role);
            // 3. Reviewer Agent (Scope Lock, Advisory Rules, persona)
            const reviewerContext = {
                executorOutput,
                ragSnapshot,
                attachmentSummary,
                activeSurface: augmentedContext.surface || "dashboard",
                userName,
                userRole: role
            };
            const { systemPrompt: reviewerSystemPrompt, userMessage: reviewerUserMessage } = (0, reviewer_1.buildReviewerPrompt)(reviewerContext);
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
            let currentStream = null;
            while (attempts < maxAttempts) {
                let text = "";
                if (!currentStream) {
                    currentStream = yield (0, llm_streamer_1.createAiStream)(mergedContext, finalMessagesUsed, edgeContextPayload, role, undefined, finalSystemPromptUsed);
                }
                const reader = currentStream.getReader();
                const decoder = new TextDecoder();
                while (true) {
                    const { done, value } = yield reader.read();
                    if (done)
                        break;
                    text += decoder.decode(value, { stream: true });
                }
                text += decoder.decode();
                const words = text.split(/\s+/).filter(Boolean);
                tokenCount = words.length;
                if ((0, guardrail_signatures_1.hasFailureSignature)(text) && tokenCount <= 40) {
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
                        currentStream = null;
                        continue;
                    }
                    else {
                        failureDetected = true;
                        finalRawText = text;
                    }
                }
                else {
                    failureDetected = (0, guardrail_signatures_1.hasFailureSignature)(text);
                    finalRawText = text;
                    break;
                }
            }
            yield (0, governance_filters_1.logAiInteraction)({
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
                    return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)(JSON.stringify({ type: "control", action: "RESET_STREAM" }) + "\n"));
                }
                else {
                    // Late failure -> Send WARNING control packet + governed text
                    let safe = (0, harita_governance_1.sanitizeAiResponse)(finalRawText);
                    safe = (0, harita_governance_1.filterTechnicalLeakage)(safe);
                    if ((0, harita_governance_1.containsAuthoritativeClaim)(safe)) {
                        safe = (0, harita_governance_1.getAuthoritativeClaimRefusal)();
                    }
                    safe = safe.replace(/(?:^|\n)\*{0,2}(Direct Answer|Consultant Assessment|Answer)\*{0,2}\s*:\s*/gi, (match) => {
                        return match.startsWith("\n") ? "\n" : "";
                    });
                    safe = safe.replace(/([.!?])\s*\*{0,2}(Direct Answer|Consultant Assessment)\*{0,2}\s*:\s*/gi, "$1 ");
                    if (session.id) {
                        yield harita_runtime_service_1.haritaRuntimeService.storeMessage(session.id, "assistant", safe);
                    }
                    const warningPacket = JSON.stringify({
                        type: "control",
                        action: "WARNING",
                        message: "Warning: Harita detected a potential system instruction or persona violation mid-stream."
                    }) + "\n";
                    const tokenPacket = JSON.stringify({ type: "token", content: safe }) + "\n";
                    return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)(warningPacket + tokenPacket));
                }
            }
            // Normal successful response -> Govern and send token packet
            let safe = (0, harita_governance_1.sanitizeAiResponse)(finalRawText);
            safe = (0, harita_governance_1.filterTechnicalLeakage)(safe);
            if ((0, harita_governance_1.containsAuthoritativeClaim)(safe)) {
                safe = (0, harita_governance_1.getAuthoritativeClaimRefusal)();
            }
            safe = safe.replace(/(?:^|\n)\*{0,2}(Direct Answer|Consultant Assessment|Answer)\*{0,2}\s*:\s*/gi, (match) => {
                return match.startsWith("\n") ? "\n" : "";
            });
            safe = safe.replace(/([.!?])\s*\*{0,2}(Direct Answer|Consultant Assessment)\*{0,2}\s*:\s*/gi, "$1 ");
            if (session.id) {
                yield harita_runtime_service_1.haritaRuntimeService.storeMessage(session.id, "assistant", safe);
            }
            return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)(JSON.stringify({ type: "token", content: safe }) + "\n"));
        }
        catch (error) {
            console.error("[Assistant] AI pipeline failed:", error);
            const errMsg = (error === null || error === void 0 ? void 0 : error.message) || String(error);
            const isRateLimit = errMsg.toLowerCase().includes("quota") ||
                errMsg.toLowerCase().includes("429") ||
                errMsg.toLowerCase().includes("rate limit");
            if (isRateLimit) {
                return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)("⚠️ **Rate Limit Expired**: The AI request quota has been exceeded. Please try again in a moment."));
            }
            return (0, stream_utils_1.createResponseStream)((0, stream_utils_1.createTextStream)(`⚠️ **System Error**: ${errMsg}`));
        }
    });
}
function normalizeCreditCode(code) {
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
function resolveFactualQuery(prompt, focusedProjectId, projectIds, role) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const q = prompt.toLowerCase().trim();
        if (!projectIds.length)
            return null;
        const reader = env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : (0, server_1.createClient)();
        const targetIds = focusedProjectId ? [focusedProjectId] : projectIds;
        // --- Score / points query ---
        if (q.includes("point") || q.includes("score") || q.includes("how much") ||
            q.includes("total score") || q.includes("max score") || q.includes("maximum score") ||
            q.includes("comply all") || q.includes("complete all") || q.includes("if we complete")) {
            const { data: credits } = yield reader
                .from("project_credits")
                .select("credit_code, credit_name, status, max_points, na, category_name")
                .in("project_id", targetIds);
            if (credits === null || credits === void 0 ? void 0 : credits.length) {
                // Fetch project name for display
                let projectLabel = "this project";
                if (focusedProjectId) {
                    const { data: proj } = yield reader.from("projects").select("name").eq("id", focusedProjectId).maybeSingle();
                    if (proj === null || proj === void 0 ? void 0 : proj.name)
                        projectLabel = `the ${proj.name} project`;
                }
                const activeCredits = credits.filter(c => !c.na);
                const naCredits = credits.filter(c => c.na);
                const totalPossible = activeCredits.reduce((sum, c) => { var _a; return sum + Number((_a = c.max_points) !== null && _a !== void 0 ? _a : 0); }, 0);
                const currentScore = activeCredits
                    .filter(c => c.status === "APPROVED" || c.status === "complete")
                    .reduce((sum, c) => { var _a; return sum + Number((_a = c.max_points) !== null && _a !== void 0 ? _a : 0); }, 0);
                const pendingPoints = activeCredits
                    .filter(c => c.status !== "APPROVED" && c.status !== "complete")
                    .reduce((sum, c) => { var _a; return sum + Number((_a = c.max_points) !== null && _a !== void 0 ? _a : 0); }, 0);
                const naPoints = credits.filter(c => c.na).reduce((sum, c) => { var _a; return sum + Number((_a = c.max_points) !== null && _a !== void 0 ? _a : 0); }, 0);
                const certLevel = totalPossible >= 80 ? "Platinum" : totalPossible >= 60 ? "Gold" : totalPossible >= 50 ? "Silver" : "Certified";
                return [
                    `**If all active credits are complied, ${projectLabel} can achieve a maximum of ${totalPossible} points.**`,
                    ``,
                    `**Score Breakdown:**`,
                    `  \u2022 Currently earned (Approved/Complete): **${currentScore} pts**`,
                    `  \u2022 Pending (Potential): ${pendingPoints} pts`,
                    ``,
                    `**Total Active Credits:** ${activeCredits.length} credits (${naCredits.length} marked Not Required — excluded from scoring)`,
                    ...(naCredits.length > 0 ? [`**Not Required (NA):** ${naCredits.map(c => { var _a; return `${c.credit_code} (${Number((_a = c.max_points) !== null && _a !== void 0 ? _a : 0)} pts)`; }).join(", ")} — these ${naPoints} pts are excluded from the total possible score`] : []),
                    ``,
                    `**Maximum certification level achievable:** ${certLevel} (${totalPossible} pts)`,
                    `  \u2022 Certified = 50 pts | Silver = 51–59 | Gold = 60–79 | Platinum = 80+`,
                ].join("\n");
            }
        }
        // --- Credit count query ---
        if ((q.includes("how many credits") || q.includes("total credits") || q.includes("credits total") || q.includes("how many total credits")) &&
            !q.includes("who") && !q.includes("assign")) {
            const { data: credits } = yield reader
                .from("project_credits")
                .select("id, credit_code, category_name, category, status, project_id, na, max_points")
                .in("project_id", targetIds);
            if (!(credits === null || credits === void 0 ? void 0 : credits.length))
                return null;
            const total = credits.length;
            const naCount = credits.filter(c => c.na).length;
            const activeCredits = credits.filter(c => !c.na);
            const complete = activeCredits.filter(c => c.status === "APPROVED" || c.status === "complete").length;
            const inProgress = activeCredits.filter(c => c.status === "IN_PROGRESS").length;
            const draft = activeCredits.filter(c => c.status === "DRAFT").length;
            const blocked = activeCredits.filter(c => c.status === "BLOCKED").length;
            const naCredits = credits.filter(c => c.na);
            const byCategory = {};
            for (const c of activeCredits) {
                const cat = (_b = (_a = c.category_name) !== null && _a !== void 0 ? _a : c.category) !== null && _b !== void 0 ? _b : "Uncategorised";
                byCategory[cat] = ((_c = byCategory[cat]) !== null && _c !== void 0 ? _c : 0) + 1;
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
        const assignMatch = (_d = q.match(/who\s+(?:is\s+|are\s+)?(?:assigned|working|owns|responsible)\s+(?:to\s+|on\s+|for\s+)?([a-z]{2,4}\s?[a-z0-9]{1,4}\s*[0-9]{0,2})/i)) !== null && _d !== void 0 ? _d : q.match(/assigned\s+(?:to\s+|on\s+)?([a-z]{2,4}\s?[a-z0-9]{1,4}\s*[0-9]{0,2})/i);
        if (assignMatch) {
            let rawCode = ((_e = assignMatch[1]) !== null && _e !== void 0 ? _e : "").trim().toUpperCase().replace(/\s+/, " ");
            if (rawCode) {
                rawCode = normalizeCreditCode(rawCode);
                const { data: credit } = yield reader
                    .from("project_credits")
                    .select("id, project_id, credit_code, credit_name, status, assigned_user_id, responsible_role, completion_pct, documents_required")
                    .in("project_id", targetIds)
                    .eq("credit_code", rawCode)
                    .maybeSingle();
                if (credit) {
                    // Need to import or re-fetch getCreditAssignmentGraph
                    // But since this is inside route.ts, I can just dynamically import it
                    const { getCreditAssignmentGraph } = yield Promise.resolve().then(() => __importStar(require("@/lib/harita-engine/services/credit-assignment-graph")));
                    const graphMap = yield getCreditAssignmentGraph(targetIds, [credit], reader);
                    const graph = graphMap.get(credit.id);
                    let lines = [
                        `**${credit.credit_code} — ${(_f = credit.credit_name) !== null && _f !== void 0 ? _f : ""}**`,
                        ``,
                    ];
                    if (!graph || graph.requirements.length === 0) {
                        let assignedTo = "Unassigned";
                        if (credit.assigned_user_id) {
                            const { data: prof } = yield reader
                                .from("profiles")
                                .select("full_name, email")
                                .eq("user_id", credit.assigned_user_id)
                                .maybeSingle();
                            if (prof)
                                assignedTo = `${prof.full_name} (${prof.email})`;
                        }
                        else if (credit.responsible_role) {
                            assignedTo = credit.responsible_role;
                        }
                        lines.push(`**Assigned to:** ${assignedTo}`);
                    }
                    else {
                        const assignedContributors = new Set(graph.requirements.filter(r => r.contributorId).map(r => r.contributorId));
                        if (assignedContributors.size <= 1) {
                            const singleContributor = (_h = (_g = graph.requirements.find(r => r.contributorName)) === null || _g === void 0 ? void 0 : _g.contributorName) !== null && _h !== void 0 ? _h : "Unassigned";
                            lines.push(`**Assigned to:** ${singleContributor}`);
                        }
                        else {
                            lines.push(`**${credit.credit_code} currently has multiple contributors.**`);
                            for (const req of graph.requirements) {
                                lines.push(`- **${req.requirementType}**: ${(_j = req.contributorName) !== null && _j !== void 0 ? _j : "Unassigned"}`);
                            }
                        }
                    }
                    lines.push(``); // Blank line to break the list block
                    lines.push(`**Status:** ${credit.status}`);
                    lines.push(`**Completion:** ${(_k = credit.completion_pct) !== null && _k !== void 0 ? _k : 0}%`);
                    return lines.join("\n");
                }
            }
        }
        // --- Blocked credits ---
        if (q.includes("blocked") || q.includes("what is blocking") || q.includes("what's blocking")) {
            const { data: credits } = yield reader
                .from("project_credits")
                .select("credit_code, credit_name, status, blocked_by, assigned_user_id")
                .in("project_id", targetIds)
                .eq("status", "BLOCKED");
            if (!(credits === null || credits === void 0 ? void 0 : credits.length)) {
                return "**No blocked credits found** in the current project(s). All credits are progressing normally.";
            }
            const lines = [`**Blocked Credits (${credits.length}):**`, ``];
            for (const c of credits) {
                lines.push(`  • **${c.credit_code}** — ${(_l = c.credit_name) !== null && _l !== void 0 ? _l : ""}`);
                if (c.blocked_by)
                    lines.push(`    Blocked by: ${c.blocked_by}`);
            }
            return lines.join("\n");
        }
        // --- List all credits / show tracker ---
        if ((q.includes("list") || q.includes("show") || q.includes("all credits") || q.includes("credit tracker") || q.includes("full tracker"))
            && (q.includes("credit") || q.includes("tracker"))
            && !q.includes("who")) {
            const { data: credits } = yield reader
                .from("project_credits")
                .select("credit_code, credit_name, status, assigned_user_id, responsible_role, completion_pct, category_name, na, max_points")
                .in("project_id", targetIds)
                .order("credit_code");
            if (!(credits === null || credits === void 0 ? void 0 : credits.length))
                return null;
            // Batch resolve assignments
            const uids = [...new Set(credits.map(c => c.assigned_user_id).filter(Boolean))];
            const profileMap = new Map();
            if (uids.length) {
                const { data: profs } = yield reader.from("profiles").select("user_id, full_name").in("user_id", uids);
                for (const p of profs !== null && profs !== void 0 ? profs : [])
                    profileMap.set(p.user_id, (_m = p.full_name) !== null && _m !== void 0 ? _m : "Unknown");
            }
            const activeCredits = credits.filter(c => !c.na);
            const naCredits = credits.filter(c => c.na);
            const structuredTracker = credits.map(c => {
                var _a, _b, _c, _d, _e;
                return ({
                    category: (_a = c.category_name) !== null && _a !== void 0 ? _a : "Uncategorised",
                    code: c.credit_code,
                    name: (_b = c.credit_name) !== null && _b !== void 0 ? _b : "",
                    status: c.status,
                    not_required: c.na,
                    max_points: c.max_points,
                    assigned: c.assigned_user_id ? ((_c = profileMap.get(c.assigned_user_id)) !== null && _c !== void 0 ? _c : "Unknown") : ((_d = c.responsible_role) !== null && _d !== void 0 ? _d : "Unassigned"),
                    completion_pct: (_e = c.completion_pct) !== null && _e !== void 0 ? _e : 0
                });
            });
            return JSON.stringify({
                trackerType: "Full Credit Tracker",
                totalCredits: credits.length,
                activeCredits: activeCredits.length,
                naCredits: naCredits.length,
                data: structuredTracker
            }, null, 2);
        }
        return null;
    });
}
