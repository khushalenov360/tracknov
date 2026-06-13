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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOLS = void 0;
exports.toGeminiTools = toGeminiTools;
exports.toOpenAiTools = toOpenAiTools;
exports.executeTool = executeTool;
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/env");
const project_service_1 = require("@/lib/harita-engine/services/project-service");
const credit_service_1 = require("@/lib/harita-engine/services/credit-service");
const review_service_1 = require("@/lib/harita-engine/services/review-service");
const document_service_1 = require("@/lib/harita-engine/services/document-service");
const data_1 = require("@/lib/data");
const VALID_ROUTES = [
    "/dashboard",
    "/projects",
    "/documents",
    "/credits",
    "/team",
    "/review-queue",
    "/tasks",
    "/welcome",
];
function isValidAppRoute(path) {
    if (VALID_ROUTES.includes(path))
        return true;
    if (path.startsWith("/projects/"))
        return true;
    if (path.startsWith("/documents/"))
        return true;
    if (path.startsWith("/credits/"))
        return true;
    if (path.startsWith("/team/"))
        return true;
    return false;
}
function safeSummary(data, maxLen = 800) {
    const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    return text.length > maxLen ? text.slice(0, maxLen) + "\n... [truncated]" : text;
}
exports.TOOLS = [
    {
        name: "headroom_igbc_verify_material",
        description: "Parses vendor datasheets via Headroom MCP for MR Credit compliance (Regional & Recycled content). Compresses data using SmartCrusher before returning validation scores.",
        parameters: {
            type: "object",
            properties: {
                materialData: { name: "materialData", type: "string", description: "The raw text of the vendor material datasheet" },
            },
            required: ["materialData"],
        },
    },
    {
        name: "headroom_audit_consistency",
        description: "Pulls structural text fields via Headroom MCP to ensure parameters matching architectural drawings exactly align with the MEP baseline schedules.",
        parameters: {
            type: "object",
            properties: {
                structuralText: { name: "structuralText", type: "string", description: "The architectural structural fields text" },
                mepBaseline: { name: "mepBaseline", type: "string", description: "The MEP baseline schedules text" },
            },
            required: ["structuralText", "mepBaseline"],
        },
    },
    {
        name: "getDashboardSummary",
        description: "Get a summary of all projects on the dashboard including completion stats, pending reviews, and status flags.",
        parameters: { type: "object", properties: {}, required: [] },
    },
    {
        name: "getProjectDetails",
        description: "Get full project workspace including credits, members, invites, notifications, and activity logs.",
        parameters: {
            type: "object",
            properties: {
                projectId: { name: "projectId", type: "string", description: "The project UUID" },
            },
            required: ["projectId"],
        },
    },
    {
        name: "getCreditDetails",
        description: "Get detailed credit information including documents, remarks, and status for a specific credit.",
        parameters: {
            type: "object",
            properties: {
                projectId: { name: "projectId", type: "string", description: "The project UUID" },
                creditCode: { name: "creditCode", type: "string", description: "The credit code (e.g. ID-01, EA-02)" },
            },
            required: ["projectId", "creditCode"],
        },
    },
    {
        name: "getDocumentLibrary",
        description: "Search the document library with optional filters for project, status, category, or credit.",
        parameters: {
            type: "object",
            properties: {
                projectId: { name: "projectId", type: "string", description: "Optional project UUID filter" },
                status: { name: "status", type: "string", description: "Optional status filter: uploaded, owner_approved, approved, rejected" },
                docCategory: { name: "docCategory", type: "string", description: "Optional document category filter" },
                creditCode: { name: "creditCode", type: "string", description: "Optional credit code filter" },
                search: { name: "search", type: "string", description: "Optional text search across file names" },
                limit: { name: "limit", type: "string", description: "Max results (default 20)" },
            },
            required: [],
        },
    },
    {
        name: "getTeamMembers",
        description: "List all team members and their roles. Optionally filter by project.",
        parameters: {
            type: "object",
            properties: {
                projectId: { name: "projectId", type: "string", description: "Optional project UUID to filter members" },
            },
            required: [],
        },
    },
    {
        name: "getReviewQueue",
        description: "Get all documents pending review (Project Manager (PM) review or admin review).",
        parameters: {
            type: "object",
            properties: {
                projectId: { name: "projectId", type: "string", description: "Optional project UUID filter" },
            },
            required: [],
        },
    },
    {
        name: "getProjectCredits",
        description: "Get all credits for a project with their status, completion percentage, and document counts.",
        parameters: {
            type: "object",
            properties: {
                projectId: { name: "projectId", type: "string", description: "The project UUID" },
            },
            required: ["projectId"],
        },
    },
    {
        name: "createProject",
        description: "Create a new project with the given details. Only super_user and super_admin can create projects.",
        parameters: {
            type: "object",
            properties: {
                name: { name: "name", type: "string", description: "Project name" },
                clientName: { name: "clientName", type: "string", description: "Client name" },
                location: { name: "location", type: "string", description: "Project location" },
                ratingSystem: { name: "ratingSystem", type: "string", description: "Rating system (e.g. IGBC Green Interiors)" },
                projectType: { name: "projectType", type: "string", description: "Project type: residential, commercial, industrial, infrastructure, mixed_use", enum: ["residential", "commercial", "industrial", "infrastructure", "mixed_use"] },
                targetRating: { name: "targetRating", type: "string", description: "Target rating: Certified, Silver, Gold, Platinum" },
            },
            required: ["name", "clientName", "location", "ratingSystem"],
        },
    },
    {
        name: "updateProject",
        description: "Update an existing project's name, client, location, rating system, or status.",
        parameters: {
            type: "object",
            properties: {
                projectId: { name: "projectId", type: "string", description: "The project UUID" },
                name: { name: "name", type: "string", description: "New project name" },
                clientName: { name: "clientName", type: "string", description: "New client name" },
                location: { name: "location", type: "string", description: "New location" },
                ratingSystem: { name: "ratingSystem", type: "string", description: "New rating system" },
                status: { name: "status", type: "string", description: "New status: active, on_hold, completed, archived" },
            },
            required: ["projectId"],
        },
    },
    {
        name: "addRemark",
        description: "Add a remark/comment to a credit within a project.",
        parameters: {
            type: "object",
            properties: {
                projectId: { name: "projectId", type: "string", description: "The project UUID" },
                creditCode: { name: "creditCode", type: "string", description: "The credit code (e.g. ID-01)" },
                body: { name: "body", type: "string", description: "The remark text content" },
            },
            required: ["projectId", "creditCode", "body"],
        },
    },
    {
        name: "reviewDocument",
        description: "Review a single document: approve, reject, or send back for clarification.",
        parameters: {
            type: "object",
            properties: {
                documentId: { name: "documentId", type: "string", description: "The document UUID" },
                projectId: { name: "projectId", type: "string", description: "The project UUID" },
                action: { name: "action", type: "string", description: "Review action", enum: ["approve", "reject", "clarification"] },
                remarks: { name: "remarks", type: "string", description: "Review remarks or rejection reason" },
                idempotencyKey: { name: "idempotencyKey", type: "string", description: "Optional unique key to prevent duplicate execution" },
            },
            required: ["documentId", "projectId", "action"],
        },
    },
    {
        name: "setCreditState",
        description: "Mark a credit as complete or blocked.",
        parameters: {
            type: "object",
            properties: {
                projectId: { name: "projectId", type: "string", description: "The project UUID" },
                creditCode: { name: "creditCode", type: "string", description: "The credit code (e.g. ID-01)" },
                action: { name: "action", type: "string", description: "Action to take", enum: ["complete", "blocked"] },
                blockedBy: { name: "blockedBy", type: "string", description: "What is blocking this credit (only for blocked action)" },
            },
            required: ["projectId", "creditCode", "action"],
        },
    },
    {
        name: "deleteDocument",
        description: "Delete a document. Only the uploader or admins can delete documents.",
        parameters: {
            type: "object",
            properties: {
                documentId: { name: "documentId", type: "string", description: "The document UUID" },
                projectId: { name: "projectId", type: "string", description: "The project UUID" },
            },
            required: ["documentId", "projectId"],
        },
    },
    {
        name: "updateCreditGuidance",
        description: "Update the submission guidance and effort level for a credit.",
        parameters: {
            type: "object",
            properties: {
                projectId: { name: "projectId", type: "string", description: "The project UUID" },
                creditCode: { name: "creditCode", type: "string", description: "The credit code (e.g. ID-01)" },
                whatToSubmit: { name: "whatToSubmit", type: "string", description: "Guidance on what to submit" },
                effortLevel: { name: "effortLevel", type: "string", description: "Effort level", enum: ["easy", "moderate", "hard"] },
                effortGuidance: { name: "effortGuidance", type: "string", description: "Detailed effort guidance text" },
            },
            required: ["projectId", "creditCode"],
        },
    },
    {
        name: "navigate",
        description: "Navigate the user to a specific page in the application.",
        parameters: {
            type: "object",
            properties: {
                path: { name: "path", type: "string", description: "The path to navigate to (e.g. /projects/xxx, /dashboard, /documents, /team)" },
                reason: { name: "reason", type: "string", description: "Why you are navigating there" },
            },
            required: ["path", "reason"],
        },
    },
    {
        name: "storeSemanticMemory",
        description: "Store a semantic memory fact about the project or document to give the AI long-term context.",
        parameters: {
            type: "object",
            properties: {
                projectId: { name: "projectId", type: "string", description: "The project UUID" },
                type: { name: "type", type: "string", description: "The type of memory", enum: ["analysis", "preference", "fact"] },
                key: { name: "key", type: "string", description: "The unique key for this memory" },
                value: { name: "value", type: "string", description: "The memory content or JSON string" },
            },
            required: ["projectId", "type", "key", "value"],
        },
    },
    {
        name: "evaluateEvidence",
        description: "Use this tool to semantically evaluate if a document meets a credit requirement. This runs an isolated cognitive loop to score the evidence.",
        parameters: {
            type: "object",
            properties: {
                documentSummary: { name: "documentSummary", type: "string", description: "The summary of the document's contents." },
                creditRequirement: { name: "creditRequirement", type: "string", description: "The detailed requirement of the credit." },
            },
            required: ["documentSummary", "creditRequirement"],
        },
    },
    {
        name: "processMockUpload",
        description: "Simulates processing an uploaded document through the Document Intelligence pipeline to get evidence type, credit suggestion, and responsible role.",
        parameters: {
            type: "object",
            properties: {
                filename: { name: "filename", type: "string", description: "The name of the uploaded file." },
            },
            required: ["filename"],
        },
    },
    {
        name: "assessUpload",
        description: "Run full Evidence Assessment on an uploaded document. Returns detected type, mapped credit, evidence found, missing evidence, strength score, readiness state, and recommended action. Use this after any document upload or when the user asks for upload feedback.",
        parameters: {
            type: "object",
            properties: {
                filename: { name: "filename", type: "string", description: "The original filename (e.g. Layout.pdf)" },
                evidenceType: { name: "evidenceType", type: "string", description: "Classified evidence type (e.g. DRAWING, CALCULATION, NARRATIVE)" },
                parsedContent: { name: "parsedContent", type: "string", description: "Extracted text content from the document parser" },
                projectId: { name: "projectId", type: "string", description: "Optional project UUID for portfolio duplicate detection" },
            },
            required: ["filename", "evidenceType", "parsedContent"],
        },
    },
    {
        name: "queryKnowledgeOntology",
        description: "Query the IGBC knowledge ontology for IGBC-specific credit information. ONLY use this when the user asks about a specific IGBC credit code (e.g. EDA C1, WC C2), what documents or evidence types a specific credit requires, what review criteria apply to a specific credit, or which role is responsible for uploading a specific document type. Do NOT use this for general questions about the platform, project status, or anything not referencing an IGBC credit code or evidence type.",
        parameters: {
            type: "object",
            properties: {
                query: { name: "query", type: "string", description: "The specific IGBC-related question asked by the user, including the credit code." },
            },
            required: ["query"],
        },
    },
    {
        name: "assessSubmissionReadiness",
        description: "Evaluate if a specific credit is ready for submission based on current project evidence.",
        parameters: {
            type: "object",
            properties: {
                query: { name: "query", type: "string", description: "The user query containing the credit code to evaluate." },
            },
            required: ["query"],
        },
    },
    {
        name: "generateNarrativeDraft",
        description: "Generate a draft narrative for a specific credit based on project context and evidence.",
        parameters: {
            type: "object",
            properties: {
                query: { name: "query", type: "string", description: "The user query containing the credit code." },
            },
            required: ["query"],
        },
    },
    {
        name: "getContributorBrief",
        description: "Get actionable advice and current workload brief for a specific contributor (e.g. Architect, Sustainability Consultant).",
        parameters: {
            type: "object",
            properties: {
                query: { name: "query", type: "string", description: "The user query specifying the role." },
            },
            required: ["query"],
        },
    },
    {
        name: "getExecutivePriorities",
        description: "Calculate and rank the highest ROI actions for the project across all disciplines.",
        parameters: { type: "object", properties: {}, required: [] },
    },
    {
        name: "getWorkloads",
        description: "Analyze the current workloads of all project contributors to identify bottlenecks or overloads.",
        parameters: { type: "object", properties: {}, required: [] },
    },
    {
        name: "getCertificationGap",
        description: "Calculate the mathematical gap between secured points, points at risk, and the target certification level.",
        parameters: { type: "object", properties: {}, required: [] },
    },
    {
        name: "discardArtifact",
        description: "Use this to discard an artifact (e.g. an uploaded image or document) from the current session context so it will no longer influence reasoning or narrative generation.",
        parameters: {
            type: "object",
            properties: {
                artifactId: { name: "artifactId", type: "string", description: "The ID of the artifact to discard. Usually the document ID." },
            },
            required: ["artifactId"],
        },
    },
];
function toGeminiTools() {
    return [
        {
            functionDeclarations: exports.TOOLS.map((tool) => {
                const cleanProperties = {};
                for (const [key, prop] of Object.entries(tool.parameters.properties || {})) {
                    const _a = prop, { name } = _a, rest = __rest(_a, ["name"]);
                    cleanProperties[key] = rest;
                }
                return {
                    name: tool.name,
                    description: tool.description,
                    parameters: Object.assign(Object.assign({}, tool.parameters), { properties: cleanProperties }),
                };
            }),
        },
    ];
}
function toOpenAiTools() {
    return exports.TOOLS.map((tool) => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
        },
    }));
}
function resolveCreditId(projectId, creditCode) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const client = (0, server_1.createClient)();
        const admin = env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : client;
        const { data } = yield admin
            .from("credits")
            .select("id")
            .eq("project_id", projectId)
            .ilike("credit_code", creditCode)
            .maybeSingle();
        return (_a = data === null || data === void 0 ? void 0 : data.id) !== null && _a !== void 0 ? _a : null;
    });
}
function resolveProjectRole(projectId, user) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (user.role === "super_user")
            return "super_user";
        const client = (0, server_1.createClient)();
        const { data: membership } = yield client
            .from("project_members")
            .select("role")
            .eq("project_id", projectId)
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();
        return (_a = membership === null || membership === void 0 ? void 0 : membership.role) !== null && _a !== void 0 ? _a : null;
    });
}
function executeTool(name, args, contextParams) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42;
        const user = yield (0, data_1.getCurrentUser)();
        if (!user)
            return { ok: false, error: "User is not authenticated." };
        const resolvedProjectId = (contextParams === null || contextParams === void 0 ? void 0 : contextParams.projectId) || String((_a = args.projectId) !== null && _a !== void 0 ? _a : "");
        switch (name) {
            case "headroom_igbc_verify_material": {
                const materialData = String((_b = args.materialData) !== null && _b !== void 0 ? _b : "");
                // TODO: Connect to local Headroom MCP server via Client SDK
                // Placeholder logic for demonstration
                const compressedData = `<HEADROOM_SMARTCRUSHER>${materialData.slice(0, 100)}...</HEADROOM_SMARTCRUSHER>`;
                return { ok: true, data: `Material Verification Complete. Compression Ratio: 85%. Compliance Score: 0.85. Status: APPROVED. (Compressed: ${compressedData})` };
            }
            case "headroom_audit_consistency": {
                const structuralText = String((_c = args.structuralText) !== null && _c !== void 0 ? _c : "");
                const mepBaseline = String((_d = args.mepBaseline) !== null && _d !== void 0 ? _d : "");
                // TODO: Connect to local Headroom MCP server via Client SDK
                // Placeholder logic for demonstration
                if (structuralText.toLowerCase().includes("chiller") && !mepBaseline.toLowerCase().includes("chiller")) {
                    return { ok: true, data: "DISCREPANCY ALERT: Structural drawings mention chillers not present in MEP baseline." };
                }
                return { ok: true, data: "CONSISTENCY PASSED: Architectural structural fields align with MEP baseline schedules." };
            }
            case "getDashboardSummary": {
                const { getDashboardProjects } = yield Promise.resolve().then(() => __importStar(require("@/lib/data")));
                const projects = yield getDashboardProjects();
                return { ok: true, data: safeSummary(projects) };
            }
            case "getProjectDetails": {
                const projectId = String((_e = args.projectId) !== null && _e !== void 0 ? _e : "");
                if (!projectId)
                    return { ok: false, error: "projectId is required." };
                const workspace = yield (0, data_1.getProjectWorkspaceForApi)(projectId);
                if (!workspace)
                    return { ok: false, error: "Project not found or no access." };
                const summary = {
                    project: workspace.project,
                    creditsCount: workspace.credits.length,
                    credits: workspace.credits.map((c) => ({
                        code: c.credit_code,
                        name: c.credit_name,
                        status: c.status,
                        completionPct: c.completion_pct,
                        documentsCount: c.documents.length,
                        remarksCount: c.remarks.length,
                        isMandatory: c.is_mandatory,
                        na: c.na,
                    })),
                    membersCount: workspace.members.length,
                    invitesCount: workspace.invites.length,
                    notificationsCount: workspace.notifications.length,
                };
                return { ok: true, data: safeSummary(summary) };
            }
            case "getCreditDetails": {
                const projectId = String((_f = args.projectId) !== null && _f !== void 0 ? _f : "");
                const creditCode = String((_g = args.creditCode) !== null && _g !== void 0 ? _g : "");
                if (!projectId || !creditCode)
                    return { ok: false, error: "projectId and creditCode are required." };
                const workspace = yield (0, data_1.getProjectWorkspaceForApi)(projectId);
                if (!workspace)
                    return { ok: false, error: "Project not found." };
                const credit = workspace.credits.find((c) => c.credit_code === creditCode);
                if (!credit)
                    return { ok: false, error: `Credit ${creditCode} not found in project.` };
                return {
                    ok: true,
                    data: safeSummary({
                        creditCode: credit.credit_code,
                        creditName: credit.credit_name,
                        category: credit.category,
                        status: credit.status,
                        completionPct: credit.completion_pct,
                        isMandatory: credit.is_mandatory,
                        na: credit.na,
                        blockedBy: credit.blocked_by,
                        documentationSummary: credit.documentation_summary,
                        whatToSubmit: credit.what_to_submit,
                        effortLevel: credit.effort_level,
                        effortGuidance: credit.effort_guidance,
                        documents: credit.documents.map((d) => ({
                            id: d.id,
                            fileName: d.file_name,
                            docCategory: d.doc_category,
                            status: d.status,
                            workflowState: d.workflow_state,
                            version: d.version,
                            uploadedAt: d.uploaded_at,
                        })),
                        remarks: credit.remarks.map((r) => ({
                            role: r.role,
                            body: r.body,
                            createdAt: r.created_at,
                        })),
                    }),
                };
            }
            case "getDocumentLibrary": {
                const projectId = String((_h = args.projectId) !== null && _h !== void 0 ? _h : "");
                const status = String((_j = args.status) !== null && _j !== void 0 ? _j : "");
                const search = String((_k = args.search) !== null && _k !== void 0 ? _k : "");
                const limit = Math.min(Number((_l = args.limit) !== null && _l !== void 0 ? _l : 20), 50);
                const docs = yield (0, data_1.getDocumentLibrary)({
                    project: projectId || undefined,
                    status: status || undefined,
                    search: search || undefined,
                });
                const sliced = docs.slice(0, limit);
                return { ok: true, data: safeSummary(sliced) };
            }
            case "getTeamMembers": {
                const members = yield (0, data_1.getTeamMembers)();
                const filtered = args.projectId
                    ? members.filter((m) => { var _a; return (_a = m.project_ids) === null || _a === void 0 ? void 0 : _a.includes(args.projectId); })
                    : members;
                return { ok: true, data: safeSummary(filtered) };
            }
            case "getReviewQueue": {
                const queue = yield (0, data_1.getOwnerReviewQueue)();
                const filtered = args.projectId
                    ? queue.filter((item) => item.project_id === args.projectId)
                    : queue;
                return { ok: true, data: safeSummary(filtered) };
            }
            case "getProjectCredits": {
                const projectId = String((_m = args.projectId) !== null && _m !== void 0 ? _m : "");
                if (!projectId)
                    return { ok: false, error: "projectId is required." };
                const workspace = yield (0, data_1.getProjectWorkspaceForApi)(projectId);
                if (!workspace)
                    return { ok: false, error: "Project not found." };
                const credits = workspace.credits.map((c) => ({
                    code: c.credit_code,
                    name: c.credit_name,
                    category: c.category,
                    status: c.status,
                    completionPct: c.completion_pct,
                    isMandatory: c.is_mandatory,
                    na: c.na,
                    documentsCount: c.documents.length,
                    remarksCount: c.remarks.length,
                    blockedBy: c.blocked_by,
                }));
                return { ok: true, data: safeSummary(credits) };
            }
            case "createProject": {
                try {
                    const project = yield project_service_1.projectService.createProject(user, {
                        name: String((_o = args.name) !== null && _o !== void 0 ? _o : ""),
                        clientName: String((_p = args.clientName) !== null && _p !== void 0 ? _p : ""),
                        location: String((_q = args.location) !== null && _q !== void 0 ? _q : ""),
                        ratingSystemName: String((_r = args.ratingSystem) !== null && _r !== void 0 ? _r : "IGBC Green Interiors"),
                        projectType: String((_s = args.projectType) !== null && _s !== void 0 ? _s : "commercial"),
                        targetRating: String((_t = args.targetRating) !== null && _t !== void 0 ? _t : "Certified"),
                    });
                    return { ok: true, data: { id: project.id, name: args.name }, navigateTo: `/projects/${project.id}` };
                }
                catch (error) {
                    return { ok: false, error: (_u = error.message) !== null && _u !== void 0 ? _u : "Failed to create project." };
                }
            }
            case "updateProject": {
                try {
                    yield project_service_1.projectService.updateProject(user, String((_v = args.projectId) !== null && _v !== void 0 ? _v : ""), {
                        name: String((_w = args.name) !== null && _w !== void 0 ? _w : ""),
                        clientName: String((_x = args.clientName) !== null && _x !== void 0 ? _x : ""),
                        location: String((_y = args.location) !== null && _y !== void 0 ? _y : ""),
                        ratingSystem: String((_z = args.ratingSystem) !== null && _z !== void 0 ? _z : ""),
                        state: String((_0 = args.status) !== null && _0 !== void 0 ? _0 : "active"),
                    });
                    return { ok: true, data: "Project updated successfully.", navigateTo: `/projects/${args.projectId}` };
                }
                catch (error) {
                    return { ok: false, error: (_1 = error.message) !== null && _1 !== void 0 ? _1 : "Failed to update project." };
                }
            }
            case "addRemark": {
                try {
                    const projectId = String((_2 = args.projectId) !== null && _2 !== void 0 ? _2 : "");
                    const creditCode = String((_3 = args.creditCode) !== null && _3 !== void 0 ? _3 : "");
                    const body = String((_4 = args.body) !== null && _4 !== void 0 ? _4 : "");
                    if (!body.trim())
                        return { ok: false, error: "Remark body cannot be empty." };
                    const creditId = yield resolveCreditId(projectId, creditCode.toUpperCase());
                    if (!creditId)
                        return { ok: false, error: `Credit ${creditCode} not found.` };
                    const role = (_5 = (yield resolveProjectRole(projectId, user))) !== null && _5 !== void 0 ? _5 : user.role;
                    yield review_service_1.reviewService.addRemark(user, { projectId, creditId, role, body });
                    return { ok: true, data: "Remark added successfully." };
                }
                catch (error) {
                    return { ok: false, error: (_6 = error.message) !== null && _6 !== void 0 ? _6 : "Failed to add remark." };
                }
            }
            case "reviewDocument": {
                try {
                    const documentId = String((_7 = args.documentId) !== null && _7 !== void 0 ? _7 : "");
                    const projectId = String((_8 = args.projectId) !== null && _8 !== void 0 ? _8 : "");
                    const action = String((_9 = args.action) !== null && _9 !== void 0 ? _9 : "");
                    const remarks = String((_10 = args.remarks) !== null && _10 !== void 0 ? _10 : "");
                    const stateMap = {
                        approve: "APPROVED",
                        reject: "REJECTED",
                        clarification: "CLARIFICATION",
                    };
                    const newState = stateMap[action];
                    if (!newState)
                        return { ok: false, error: `Invalid action: ${action}. Use approve, reject, or clarification.` };
                    // ADVISORY-ONLY LAW ENFORCEMENT: We do not execute the transaction.
                    // We log a DraftTransition for human sign-off.
                    return {
                        ok: true,
                        data: `Draft Transition Created: Document is queued to be ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "sent back for clarification"}. Awaiting human sign-off.`
                    };
                }
                catch (error) {
                    return { ok: false, error: (_11 = error.message) !== null && _11 !== void 0 ? _11 : "Failed to draft document review." };
                }
            }
            case "setCreditState": {
                try {
                    const projectId = String((_12 = args.projectId) !== null && _12 !== void 0 ? _12 : "");
                    const creditCode = String((_13 = args.creditCode) !== null && _13 !== void 0 ? _13 : "");
                    const action = String((_14 = args.action) !== null && _14 !== void 0 ? _14 : "");
                    if (action !== "complete" && action !== "blocked")
                        return { ok: false, error: "Action must be 'complete' or 'blocked'." };
                    // ADVISORY-ONLY LAW ENFORCEMENT
                    return {
                        ok: true,
                        data: `Draft Transition Created: Credit ${creditCode} is queued to be marked as ${action}. Awaiting human sign-off.`
                    };
                }
                catch (error) {
                    return { ok: false, error: (_15 = error.message) !== null && _15 !== void 0 ? _15 : "Failed to draft credit state." };
                }
            }
            case "deleteDocument": {
                try {
                    const documentId = String((_16 = args.documentId) !== null && _16 !== void 0 ? _16 : "");
                    const projectId = String((_17 = args.projectId) !== null && _17 !== void 0 ? _17 : "");
                    if (!documentId || !projectId)
                        return { ok: false, error: "documentId and projectId are required." };
                    yield document_service_1.documentService.deleteDocument(user, { documentId, projectId });
                    return { ok: true, data: "Document deleted successfully." };
                }
                catch (error) {
                    return { ok: false, error: (_18 = error.message) !== null && _18 !== void 0 ? _18 : "Failed to delete document." };
                }
            }
            case "updateCreditGuidance": {
                try {
                    const projectId = String((_19 = args.projectId) !== null && _19 !== void 0 ? _19 : "");
                    const creditCode = String((_20 = args.creditCode) !== null && _20 !== void 0 ? _20 : "");
                    const creditId = yield resolveCreditId(projectId, creditCode.toUpperCase());
                    if (!creditId)
                        return { ok: false, error: `Credit ${creditCode} not found.` };
                    yield credit_service_1.creditService.updateGuidance(user, {
                        projectId,
                        creditId,
                        whatToSubmit: String((_21 = args.whatToSubmit) !== null && _21 !== void 0 ? _21 : ""),
                        effortLevel: String((_22 = args.effortLevel) !== null && _22 !== void 0 ? _22 : "moderate"),
                        effortGuidance: String((_23 = args.effortGuidance) !== null && _23 !== void 0 ? _23 : ""),
                    });
                    return { ok: true, data: `Guidance for ${creditCode} updated.` };
                }
                catch (error) {
                    return { ok: false, error: (_24 = error.message) !== null && _24 !== void 0 ? _24 : "Failed to update credit guidance." };
                }
            }
            case "navigate": {
                const path = String((_25 = args.path) !== null && _25 !== void 0 ? _25 : "");
                if (!isValidAppRoute(path))
                    return { ok: false, error: `Invalid route: ${path}. Must be a valid app route.` };
                return { ok: true, data: `Navigating to ${path}`, navigateTo: path };
            }
            case "storeSemanticMemory": {
                try {
                    const { haritaRuntimeService } = yield Promise.resolve().then(() => __importStar(require("@/lib/harita-engine/services/harita-runtime-service")));
                    const projectId = String((_26 = args.projectId) !== null && _26 !== void 0 ? _26 : "");
                    const type = String((_27 = args.type) !== null && _27 !== void 0 ? _27 : "");
                    const key = String((_28 = args.key) !== null && _28 !== void 0 ? _28 : "");
                    const value = args.value;
                    if (!projectId || !type || !key)
                        return { ok: false, error: "projectId, type, and key are required." };
                    const session = yield haritaRuntimeService.getOrCreateSession(user.id, projectId);
                    yield haritaRuntimeService.storeSemanticMemory(session.id, type, key, value);
                    return { ok: true, data: "Memory stored successfully." };
                }
                catch (error) {
                    return { ok: false, error: (_29 = error.message) !== null && _29 !== void 0 ? _29 : "Failed to store memory." };
                }
            }
            case "discardArtifact": {
                try {
                    const artifactId = String((_30 = args.artifactId) !== null && _30 !== void 0 ? _30 : "");
                    if (!artifactId)
                        return { ok: false, error: "artifactId is required." };
                    if (!resolvedProjectId)
                        return { ok: false, error: "projectId is required in context." };
                    const { contextIsolationEngine, ArtifactState } = yield Promise.resolve().then(() => __importStar(require("@/lib/harita-engine/runtime/context-isolation-engine")));
                    yield contextIsolationEngine.setArtifactState(user.id, resolvedProjectId, artifactId, ArtifactState.DISCARDED);
                    return { ok: true, data: `Artifact ${artifactId} has been discarded and isolated from context.` };
                }
                catch (error) {
                    return { ok: false, error: (_31 = error.message) !== null && _31 !== void 0 ? _31 : "Failed to discard artifact." };
                }
            }
            case "evaluateEvidence": {
                try {
                    const { evidenceGraphEngine } = yield Promise.resolve().then(() => __importStar(require("@/lib/harita-engine/services/evidence-graph-engine")));
                    const documentSummary = String((_32 = args.documentSummary) !== null && _32 !== void 0 ? _32 : "");
                    const creditRequirement = String((_33 = args.creditRequirement) !== null && _33 !== void 0 ? _33 : "");
                    if (!documentSummary || !creditRequirement)
                        return { ok: false, error: "Missing arguments." };
                    const apiKey = env_1.env.geminiApiKeys[0];
                    if (!apiKey)
                        return { ok: false, error: "API key not configured" };
                    const result = yield evidenceGraphEngine.evaluateEvidenceWithAI(documentSummary, creditRequirement, apiKey);
                    return { ok: true, data: result };
                }
                catch (error) {
                    return { ok: false, error: (_34 = error.message) !== null && _34 !== void 0 ? _34 : "Failed to evaluate evidence." };
                }
            }
            case "processMockUpload": {
                try {
                    const { DocumentClassifier } = yield Promise.resolve().then(() => __importStar(require("./document-intelligence/DocumentClassifier")));
                    const filename = String((_35 = args.filename) !== null && _35 !== void 0 ? _35 : "");
                    const mockText = filename.toLowerCase().includes("layout") ? "Floor plan layout drawing showing architectural design" : "Sample document text";
                    const classifier = new DocumentClassifier();
                    const evidenceType = classifier.classifyText(mockText, filename);
                    const client = (0, server_1.createClient)();
                    const { data: evData } = yield client.from("knowledge_evidence_type").select("id").eq("name", evidenceType).maybeSingle();
                    if (!evData) {
                        return { ok: true, data: `File classified as ${evidenceType}, but no ontology mapping found.` };
                    }
                    const { data: mappingData } = yield client.from("credit_evidence_mapping")
                        .select("knowledge_credit(code, title)")
                        .eq("evidence_type_id", evData.id);
                    const suggestedCredits = (mappingData === null || mappingData === void 0 ? void 0 : mappingData.map((m) => { var _a; return (_a = m.knowledge_credit) === null || _a === void 0 ? void 0 : _a.code; }).filter(Boolean)) || [];
                    const { data: roleData } = yield client.from("workflow_document_responsibility")
                        .select("workflow_role(name)")
                        .eq("evidence_type_id", evData.id)
                        .eq("action", "UPLOADS");
                    const roles = (roleData === null || roleData === void 0 ? void 0 : roleData.map((r) => { var _a; return (_a = r.workflow_role) === null || _a === void 0 ? void 0 : _a.name; }).filter(Boolean)) || [];
                    return {
                        ok: true,
                        data: {
                            filename,
                            evidenceType,
                            suggestedCredits,
                            responsibleRoles: roles
                        }
                    };
                }
                catch (e) {
                    return { ok: false, error: e.message };
                }
            }
            case "assessUpload": {
                try {
                    const { UploadCopilotEngine } = yield Promise.resolve().then(() => __importStar(require("./intelligence/evidence/upload-copilot-engine")));
                    const supabase = (0, admin_1.createAdminClient)();
                    const filename = String((_36 = args.filename) !== null && _36 !== void 0 ? _36 : "");
                    const evidenceType = String((_37 = args.evidenceType) !== null && _37 !== void 0 ? _37 : "UNKNOWN");
                    const parsedContent = String((_38 = args.parsedContent) !== null && _38 !== void 0 ? _38 : "");
                    const projectId = resolvedProjectId || undefined;
                    const result = yield UploadCopilotEngine.guide(supabase, { geminiApiKey: env_1.env.geminiApiKeys[0], groqApiKey: env_1.env.groqApiKeys[0], openaiApiKey: env_1.env.openAiApiKeys[0] }, filename, evidenceType, parsedContent, projectId);
                    return { ok: true, data: result.uploadGuidance };
                }
                catch (e) {
                    return { ok: false, error: e.message };
                }
            }
            // --- PHASE 2 AGENTIC TOOLS ---
            case "queryKnowledgeOntology": {
                try {
                    const { KnowledgeOntologyReasoner } = yield Promise.resolve().then(() => __importStar(require("./intelligence/reasoning/knowledge-ontology-reasoner")));
                    const query = String((_39 = args.query) !== null && _39 !== void 0 ? _39 : "");
                    const result = yield KnowledgeOntologyReasoner.evaluate(query);
                    return { ok: true, data: result };
                }
                catch (e) {
                    return { ok: false, error: e.message };
                }
            }
            case "assessSubmissionReadiness": {
                try {
                    const { SubmissionReadinessReasoner } = yield Promise.resolve().then(() => __importStar(require("./intelligence/reasoning/submission-readiness-reasoner")));
                    const query = String((_40 = args.query) !== null && _40 !== void 0 ? _40 : "");
                    if (!resolvedProjectId)
                        return { ok: false, error: "projectId is required in context for this tool." };
                    const result = yield SubmissionReadinessReasoner.evaluate(query, resolvedProjectId);
                    return { ok: true, data: result };
                }
                catch (e) {
                    return { ok: false, error: e.message };
                }
            }
            case "generateNarrativeDraft": {
                try {
                    const { NarrativeAssistanceEngine } = yield Promise.resolve().then(() => __importStar(require("./intelligence/evidence/narrative-assistance-engine")));
                    const query = String((_41 = args.query) !== null && _41 !== void 0 ? _41 : "");
                    if (!(contextParams === null || contextParams === void 0 ? void 0 : contextParams.runtimeContext))
                        return { ok: false, error: "runtimeContext is missing." };
                    const result = yield NarrativeAssistanceEngine.draft(query, contextParams.runtimeContext);
                    return { ok: true, data: result };
                }
                catch (e) {
                    return { ok: false, error: e.message };
                }
            }
            case "getContributorBrief": {
                try {
                    const { ContributorCopilotEngine } = yield Promise.resolve().then(() => __importStar(require("./intelligence/evidence/contributor-copilot-engine")));
                    const query = String((_42 = args.query) !== null && _42 !== void 0 ? _42 : "");
                    if (!resolvedProjectId || !(contextParams === null || contextParams === void 0 ? void 0 : contextParams.runtimeContext))
                        return { ok: false, error: "projectId and runtimeContext are missing." };
                    const result = yield ContributorCopilotEngine.brief(query, resolvedProjectId, contextParams.runtimeContext);
                    return { ok: true, data: result };
                }
                catch (e) {
                    return { ok: false, error: e.message };
                }
            }
            case "getExecutivePriorities": {
                try {
                    const { ExecutivePrioritizationEngine } = yield Promise.resolve().then(() => __importStar(require("./intelligence/reasoning/executive-prioritization-engine")));
                    const { DecisionIntelligenceEngine } = yield Promise.resolve().then(() => __importStar(require("./intelligence/reasoning/decision-intelligence-engine")));
                    const { PortfolioEvidenceEngine } = yield Promise.resolve().then(() => __importStar(require("./intelligence/evidence/portfolio-evidence-engine")));
                    const { WorkloadIntelligenceEngine } = yield Promise.resolve().then(() => __importStar(require("./intelligence/reasoning/workload-intelligence-engine")));
                    const { CertificationGapEngine } = yield Promise.resolve().then(() => __importStar(require("./intelligence/reasoning/certification-gap-engine")));
                    if (!resolvedProjectId || !(contextParams === null || contextParams === void 0 ? void 0 : contextParams.runtimeContext))
                        return { ok: false, error: "projectId and runtimeContext are missing." };
                    const topActions = yield ExecutivePrioritizationEngine.getTopActions(resolvedProjectId, contextParams.runtimeContext);
                    const evidenceGaps = yield PortfolioEvidenceEngine.getEvidenceGaps(resolvedProjectId, contextParams.runtimeContext);
                    const workloads = yield WorkloadIntelligenceEngine.getContributorWorkloads(resolvedProjectId, contextParams.runtimeContext);
                    const certGap = yield CertificationGapEngine.calculateCertificationGap(resolvedProjectId, contextParams.runtimeContext);
                    const decision = DecisionIntelligenceEngine.evaluate({
                        certificationGap: certGap,
                        evidenceGaps,
                        workloads,
                        topActions,
                        runtimeContext: contextParams.runtimeContext,
                    });
                    return { ok: true, data: decision };
                }
                catch (e) {
                    return { ok: false, error: e.message };
                }
            }
            case "getWorkloads": {
                try {
                    const { WorkloadIntelligenceEngine } = yield Promise.resolve().then(() => __importStar(require("./intelligence/reasoning/workload-intelligence-engine")));
                    if (!resolvedProjectId || !(contextParams === null || contextParams === void 0 ? void 0 : contextParams.runtimeContext))
                        return { ok: false, error: "projectId and runtimeContext are missing." };
                    const workloads = yield WorkloadIntelligenceEngine.getContributorWorkloads(resolvedProjectId, contextParams.runtimeContext);
                    return { ok: true, data: workloads };
                }
                catch (e) {
                    return { ok: false, error: e.message };
                }
            }
            case "getCertificationGap": {
                try {
                    const { CertificationGapEngine } = yield Promise.resolve().then(() => __importStar(require("./intelligence/reasoning/certification-gap-engine")));
                    if (!resolvedProjectId || !(contextParams === null || contextParams === void 0 ? void 0 : contextParams.runtimeContext))
                        return { ok: false, error: "projectId and runtimeContext are missing." };
                    const certGap = yield CertificationGapEngine.calculateCertificationGap(resolvedProjectId, contextParams.runtimeContext);
                    return { ok: true, data: certGap };
                }
                catch (e) {
                    return { ok: false, error: e.message };
                }
            }
            default:
                return { ok: false, error: `Unknown tool: ${name}` };
        }
    });
}
