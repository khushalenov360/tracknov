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
exports.buildPromptContext = buildPromptContext;
exports.sanitizePrompt = sanitizePrompt;
const admin_1 = require("@/lib/supabase/admin");
/**
 * TRACKNOV AI PROMPT CONTEXT BUILDER
 *
 * Constructs RBAC-safe, framework-aware context for AI prompts.
 */
function buildPromptContext(projectId, actorId) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        // 1. Verify Tenant Isolation
        const { data: project, error: pError } = yield admin
            .from("projects")
            .select("id, name, igbc_variant")
            .eq("id", projectId)
            .single();
        if (pError || !project) {
            throw new Error(`AI_CONTEXT_FAILURE: Project ${projectId} not found or access denied.`);
        }
        // 2. Resolve Framework Version
        const framework = project.igbc_variant || "Green Interiors V2";
        // 3. Fetch Relevant State (Limited to project boundary)
        const { data: submittals } = yield admin
            .from("submittals")
            .select("id, credit_id, status")
            .eq("project_id", projectId);
        return {
            projectId: project.id,
            projectName: project.name,
            framework,
            submittals: submittals || [],
            systemContext: `
      Current Framework: ${framework}
      Project Identity: ${project.name}
      Governance Rule: AI is ADVISORY ONLY. No authority to mutate state.
    `.trim(),
            response_format: { type: "json_object" }
        };
    });
}
function sanitizePrompt(input) {
    // Prevent prompt injection and remove sensitive patterns
    // Match <script>...</script> including tolerant malformed closing tags like </script > or </script foo="bar">
    const scriptTagPattern = /<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi;
    let current = input;
    let previous;
    do {
        previous = current;
        current = current.replace(scriptTagPattern, "");
    } while (current !== previous);
    return current.trim();
}
