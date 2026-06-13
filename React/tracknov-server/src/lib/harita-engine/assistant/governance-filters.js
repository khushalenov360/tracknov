"use strict";
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
exports.applyResponseGovernance = applyResponseGovernance;
exports.logAiInteraction = logAiInteraction;
exports.tryDeterministicAnswer = tryDeterministicAnswer;
const server_1 = require("@/lib/supabase/server");
const harita_runtime_service_1 = require("@/lib/harita-engine/services/harita-runtime-service");
const harita_governance_1 = require("@/lib/harita-engine/services/harita-governance");
const guardrail_signatures_1 = require("./guardrail-signatures");
function applyResponseGovernance(inputStream, sessionId) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    return new ReadableStream({
        start(controller) {
            return __awaiter(this, void 0, void 0, function* () {
                const reader = inputStream.getReader();
                let fullText = "";
                while (true) {
                    const { done, value } = yield reader.read();
                    if (done)
                        break;
                    fullText += decoder.decode(value, { stream: true });
                }
                fullText += decoder.decode();
                const words = fullText.split(/\s+/).filter(Boolean);
                const tokenCount = words.length;
                if ((0, guardrail_signatures_1.hasFailureSignature)(fullText)) {
                    if (tokenCount <= 40) {
                        // Early failure -> Send RESET_STREAM control packet
                        controller.enqueue(encoder.encode(JSON.stringify({ type: "control", action: "RESET_STREAM" }) + "\n"));
                        controller.close();
                        return;
                    }
                    else {
                        // Late failure -> Send WARNING control packet + governed tokens
                        let safe = (0, harita_governance_1.sanitizeAiResponse)(fullText);
                        safe = (0, harita_governance_1.filterTechnicalLeakage)(safe);
                        if ((0, harita_governance_1.containsAuthoritativeClaim)(safe)) {
                            safe = (0, harita_governance_1.getAuthoritativeClaimRefusal)();
                        }
                        // Strip prefixes
                        safe = safe.replace(/(?:^|\n)\*{0,2}(Direct Answer|Consultant Assessment|Answer)\*{0,2}\s*:\s*/gi, (match) => {
                            return match.startsWith("\n") ? "\n" : "";
                        });
                        safe = safe.replace(/([.!?])\s*\*{0,2}(Direct Answer|Consultant Assessment)\*{0,2}\s*:\s*/gi, "$1 ");
                        if (sessionId) {
                            void harita_runtime_service_1.haritaRuntimeService.storeMessage(sessionId, "assistant", safe).catch(() => { });
                        }
                        controller.enqueue(encoder.encode(JSON.stringify({
                            type: "control",
                            action: "WARNING",
                            message: "Warning: Harita detected a potential system instruction or persona violation mid-stream."
                        }) + "\n"));
                        controller.enqueue(encoder.encode(JSON.stringify({ type: "token", content: safe }) + "\n"));
                        controller.close();
                        return;
                    }
                }
                // Normal response
                let safe = (0, harita_governance_1.sanitizeAiResponse)(fullText);
                safe = (0, harita_governance_1.filterTechnicalLeakage)(safe);
                if ((0, harita_governance_1.containsAuthoritativeClaim)(safe)) {
                    safe = (0, harita_governance_1.getAuthoritativeClaimRefusal)();
                }
                // Strip banned response prefixes that the LLM may still produce (anywhere in text, including mid-sentence)
                // Pattern 1: At line start (with or without bold markers)
                safe = safe.replace(/(?:^|\n)\*{0,2}(Direct Answer|Consultant Assessment|Answer)\*{0,2}\s*:\s*/gi, (match) => {
                    return match.startsWith("\n") ? "\n" : "";
                });
                // Pattern 2: Mid-sentence after punctuation e.g. '." Direct Answer: ...'
                safe = safe.replace(/([.!?])\s*\*{0,2}(Direct Answer|Consultant Assessment)\*{0,2}\s*:\s*/gi, "$1 ");
                if (sessionId) {
                    void harita_runtime_service_1.haritaRuntimeService.storeMessage(sessionId, "assistant", safe).catch(() => { });
                }
                controller.enqueue(encoder.encode(JSON.stringify({ type: "token", content: safe }) + "\n"));
                controller.close();
            });
        },
    });
}
function logAiInteraction(params) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const client = (0, server_1.createClient)();
            yield client.from("ai_interactions").insert({
                user_id: params.userId,
                intent: params.intent,
                query: params.query.slice(0, 4000),
                model: params.model,
                context_size: params.contextSize,
                token_usage: params.tokenUsage,
                fallback_used: params.fallbackUsed,
                latency_ms: params.latencyMs,
            });
        }
        catch (_a) {
            // no-op
        }
    });
}
function tryDeterministicAnswer(intent, snapshot) {
    if (!(snapshot === null || snapshot === void 0 ? void 0 : snapshot.trim())) {
        return null;
    }
    if (intent === "status") {
        const projectLines = snapshot
            .split("\n")
            .filter((line) => line.startsWith("Project "))
            .slice(0, 6);
        if (!projectLines.length) {
            return (0, harita_governance_1.normalizeHaritaResponse)({
                assessment: (0, harita_governance_1.getUnknownDataResponse)(),
                fit: "Not suitable",
                reason: "No project lines found in your accessible data.",
                recommendation: "Open a project workspace and try again.",
                confirm: "Confirm?",
            });
        }
        return (0, harita_governance_1.normalizeHaritaResponse)({
            assessment: `I found ${projectLines.length} active project snapshots in your accessible workspace.`,
            fit: "Strong",
            reason: projectLines.join(" | "),
            recommendation: "Tell me one project name/code and I will give exact pending counts and next action.",
            confirm: "Confirm?",
        });
    }
    if (intent === "workflow") {
        const workflowHints = snapshot
            .split("\n")
            .filter((line) => line.toLowerCase().includes("documents:") || line.toLowerCase().includes("credits:"))
            .slice(0, 4)
            .join(" | ");
        return (0, harita_governance_1.normalizeHaritaResponse)({
            assessment: workflowHints || (0, harita_governance_1.getUnknownDataResponse)(),
            fit: workflowHints ? "Medium" : "Not suitable",
            reason: workflowHints || "Workflow counters are not present in the current snapshot.",
            recommendation: "Ask: 'show workflow status for <project>' for a focused breakdown.",
            confirm: "Confirm?",
        });
    }
    if (intent === "validation") {
        const hasValidation = snapshot.toLowerCase().includes("required:");
        return (0, harita_governance_1.normalizeHaritaResponse)({
            assessment: hasValidation
                ? "Validation requirements are present in current tracker/credit context."
                : (0, harita_governance_1.getUnknownDataResponse)(),
            fit: hasValidation ? "Medium" : "Not suitable",
            reason: hasValidation
                ? "I can see credit requirement rows in the workspace snapshot."
                : "No validation requirement rows were found in the current context.",
            recommendation: hasValidation
                ? "Share the target credit code and document type so I can validate mapping readiness."
                : "Upload tracker or open a project with instantiated credits.",
            confirm: "Confirm?",
        });
    }
    return null;
}
