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
exports.assembleRuntimeContext = assembleRuntimeContext;
exports.formatRuntimeContext = formatRuntimeContext;
const env_1 = require("@/lib/env");
const admin_1 = require("@/lib/supabase/admin");
const server_1 = require("@/lib/supabase/server");
const certification_strategy_engine_1 = require("@/lib/harita-engine/services/certification-strategy-engine");
const submission_readiness_engine_1 = require("@/lib/harita-engine/services/submission-readiness-engine");
const credit_assignment_graph_1 = require("../../services/credit-assignment-graph");
function assembleRuntimeContext() {
    return __awaiter(this, arguments, void 0, function* (focusedProjectId = null, reqUser = null) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        const client = (0, server_1.createClient)();
        let user = reqUser;
        if (!user) {
            const { data, error: authErr } = yield client.auth.getUser();
            user = data.user;
            if (!user) {
                console.log("[assembleRuntimeContext] client.auth.getUser() returned null user! AuthError:", authErr);
                return null; // Unauthenticated
            }
        }
        console.log("[assembleRuntimeContext] Authenticated user:", user.email, user.id);
        const { data: profile } = yield client
            .from("profiles")
            .select("global_role, full_name, email")
            .eq("user_id", user.id)
            .maybeSingle();
        const userName = (_c = (_a = profile === null || profile === void 0 ? void 0 : profile.full_name) !== null && _a !== void 0 ? _a : (typeof ((_b = user.user_metadata) === null || _b === void 0 ? void 0 : _b.full_name) === "string" ? user.user_metadata.full_name : "")) !== null && _c !== void 0 ? _c : "";
        const userEmail = (_e = (_d = profile === null || profile === void 0 ? void 0 : profile.email) !== null && _d !== void 0 ? _d : user.email) !== null && _e !== void 0 ? _e : "";
        const metadataRole = typeof ((_f = user.user_metadata) === null || _f === void 0 ? void 0 : _f.role) === "string" ? user.user_metadata.role : "";
        const resolvedRole = ((_h = (_g = profile === null || profile === void 0 ? void 0 : profile.global_role) !== null && _g !== void 0 ? _g : metadataRole) !== null && _h !== void 0 ? _h : "consultant");
        const isSuperUser = ["super_user", "super_admin", "L5", "L3", "superuser"].includes(resolvedRole) || ["super_user", "superuser"].includes(metadataRole);
        const reader = isSuperUser && env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : client;
        let query = reader.from("projects").select("id, name, client, location, certification_type, status").order("created_at", { ascending: false });
        if (focusedProjectId && !isSuperUser) {
            // If not super user, we will just let RLS handle it, but we can scope the query if needed
            query = query.eq("id", focusedProjectId);
        }
        const { data: projectsData } = yield query.limit(20);
        const projects = (projectsData !== null && projectsData !== void 0 ? projectsData : []);
        const projectIds = projects.map(p => p.id);
        if (!projectIds.length) {
            console.log("[assembleRuntimeContext] No projectIds found!");
            return null;
        }
        console.log("[assembleRuntimeContext] Found projectIds:", projectIds);
        // Ensure isolation: if focusedProjectId is provided, it must be in the accessible list
        if (focusedProjectId && !projectIds.includes(focusedProjectId)) {
            throw new Error("ACCESS_DENIED_PROJECT_ISOLATION");
        }
        const targetProjectIds = focusedProjectId ? [focusedProjectId] : projectIds;
        const [creditsResult, documentsResult, guidebooksResult] = yield Promise.all([
            reader
                .from("project_credits")
                .select("id, project_id, credit_code, credit_name, status, category, category_name, assigned_user_id, responsible_role, completion_pct, max_points, is_mandatory, documents_required, what_to_submit, blocked_by, na")
                .in("project_id", targetProjectIds)
                .order("credit_code"),
            reader
                .from("project_document")
                .select("id, project_id, file_name, doc_category, state, uploaded_at")
                .in("project_id", targetProjectIds)
                .order("uploaded_at", { ascending: false })
                .limit(400),
            reader
                .from("project_guidebooks")
                .select("project_id, title, file_name, created_at")
                .in("project_id", targetProjectIds)
                .order("created_at", { ascending: false })
        ]);
        const credits = ((_j = creditsResult.data) !== null && _j !== void 0 ? _j : []).map(c => {
            var _a;
            return (Object.assign(Object.assign({}, c), { state: (_a = c.status) !== null && _a !== void 0 ? _a : "DRAFT" }));
        });
        const rawDocuments = ((_k = documentsResult.data) !== null && _k !== void 0 ? _k : []);
        const guidebooks = ((_l = guidebooksResult.data) !== null && _l !== void 0 ? _l : []);
        // Filter Active Evidence (Context Isolation WS1)
        const { contextIsolationEngine } = yield Promise.resolve().then(() => __importStar(require("../../runtime/context-isolation-engine")));
        const discardedIds = yield contextIsolationEngine.getDiscardedArtifactIds(user.id, targetProjectIds[0]);
        const documents = contextIsolationEngine.filterActiveEvidence(rawDocuments, discardedIds);
        const assignedUserIds = [...new Set(credits.map(c => c.assigned_user_id).filter(Boolean))];
        const profilesMap = {};
        if (assignedUserIds.length > 0) {
            const { data: profilesData } = yield reader.from("profiles").select("user_id, full_name, email").in("user_id", assignedUserIds);
            for (const p of profilesData !== null && profilesData !== void 0 ? profilesData : []) {
                profilesMap[p.user_id] = { full_name: (_m = p.full_name) !== null && _m !== void 0 ? _m : "Unknown", email: (_o = p.email) !== null && _o !== void 0 ? _o : "" };
            }
        }
        const { data: intelligence } = yield reader
            .from("document_intelligence")
            .select("*")
            .in("document_id", documents.slice(0, 5).map(d => d.id));
        const creditAssignmentGraph = yield (0, credit_assignment_graph_1.getCreditAssignmentGraph)(targetProjectIds, credits, reader);
        const runtimeCtx = {
            project: focusedProjectId ? ((_p = projects.find(p => p.id === focusedProjectId)) !== null && _p !== void 0 ? _p : null) : null,
            accessibleProjects: projects,
            credits,
            creditAssignmentGraph,
            documents,
            guidebooks,
            profiles: profilesMap,
            documentIntelligence: intelligence !== null && intelligence !== void 0 ? intelligence : [],
            user: {
                id: user.id,
                email: userEmail,
                name: userName,
                role: resolvedRole,
                isSuperUser
            }
        };
        return runtimeCtx;
    });
}
function formatRuntimeContext(ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const projectLines = [];
    const guidebookLines = [];
    const documentLines = [];
    const creditLines = [];
    if (ctx.project) {
        projectLines.push(`Project: ${ctx.project.name}`);
        projectLines.push(`State: ${(_a = ctx.project.status) !== null && _a !== void 0 ? _a : "unknown"} | Certification: ${(_b = ctx.project.certification_type) !== null && _b !== void 0 ? _b : "n/a"} | Client: ${(_c = ctx.project.client) !== null && _c !== void 0 ? _c : "n/a"} | Location: ${(_d = ctx.project.location) !== null && _d !== void 0 ? _d : "n/a"}`);
    }
    else {
        projectLines.push(`Accessible projects: ${ctx.accessibleProjects.length}`);
    }
    const activeCredits = ctx.credits.filter(c => !c.na);
    const completeCredits = activeCredits.filter(c => c.status === "APPROVED" || c.status === "complete").length;
    const blockedCredits = activeCredits.filter(c => c.status === "BLOCKED").length;
    const inProgressCredits = activeCredits.filter(c => c.status === "IN_PROGRESS").length;
    const draftCredits = activeCredits.filter(c => c.status === "DRAFT").length;
    const naCredits = ctx.credits.filter(c => c.na);
    projectLines.push(`Credits Loaded: ${ctx.credits.length}`);
    projectLines.push(`Active: ${activeCredits.length} (In Progress: ${inProgressCredits}, Completed: ${completeCredits}, Blocked: ${blockedCredits}, Draft: ${draftCredits})`);
    projectLines.push(`Not Required / Not Applicable: ${naCredits.length} (${naCredits.map(c => c.credit_code).join(", ") || "None"})`);
    creditLines.push(`Assignments:`);
    for (const credit of ctx.credits) {
        const graph = ctx.creditAssignmentGraph.get(credit.id);
        const completion = credit.completion_pct != null ? `${credit.completion_pct}%` : "0%";
        const blocked = credit.blocked_by ? ` [BLOCKED BY: ${credit.blocked_by}]` : "";
        const naSuffix = credit.na ? " [NOT REQUIRED / NA]" : "";
        const baseStr = `${credit.credit_code} | ${credit.credit_name} | status=${credit.status} | completion=${completion}${blocked}${naSuffix}`;
        if (!graph || graph.requirements.length === 0) {
            const p = credit.assigned_user_id ? ctx.profiles[credit.assigned_user_id] : null;
            const owner = p ? `${p.full_name} (${p.email})` : ((_e = credit.responsible_role) !== null && _e !== void 0 ? _e : "UNASSIGNED");
            creditLines.push(`${baseStr} -> ${owner} (Single Owner)`);
        }
        else {
            const contributors = new Set(graph.requirements.map(r => r.contributorId).filter(Boolean));
            if (contributors.size <= 1) {
                const singleOwner = (_g = (_f = graph.requirements.find(r => r.contributorName)) === null || _f === void 0 ? void 0 : _f.contributorName) !== null && _g !== void 0 ? _g : "Unassigned";
                creditLines.push(`${baseStr} -> ${singleOwner} (Single Owner)`);
            }
            else {
                creditLines.push(`${baseStr} -> MULTIPLE CONTRIBUTORS`);
                for (const req of graph.requirements) {
                    creditLines.push(`  - ${req.requirementType}: ${(_h = req.contributorName) !== null && _h !== void 0 ? _h : "Unassigned"}`);
                }
            }
        }
    }
    const uploadedCount = ctx.documents.filter((d) => d.state === "READY" || d.state === "uploaded").length;
    const ownerReviewCount = ctx.documents.filter((d) => d.state === "SUBMITTED").length;
    const approvedCount = ctx.documents.filter((d) => d.state === "APPROVED").length;
    documentLines.push(`Uploaded: ${uploadedCount} | Pending Review: ${ownerReviewCount} | Approved: ${approvedCount}`);
    const recentFiles = ctx.documents.slice(0, 5).map(doc => `${doc.file_name} [${doc.doc_category}/${doc.state}]`).join("; ");
    documentLines.push(`Recent files: ${recentFiles || "none"}`);
    if (ctx.documentIntelligence.length) {
        documentLines.push(`Document intelligence:`);
        for (const intel of ctx.documentIntelligence) {
            const doc = ctx.documents.find(d => d.id === intel.document_id);
            documentLines.push(`- ${doc === null || doc === void 0 ? void 0 : doc.file_name}: ${intel.summary} [Relevance: ${intel.relevance_score}%] Risks: ${((_j = intel.risks) === null || _j === void 0 ? void 0 : _j.join(", ")) || "None"}`);
        }
    }
    // Submission Readiness — EXCLUDE na credits
    const topPendingEvaluated = ctx.credits
        .filter((credit) => !credit.na && credit.status !== "APPROVED" && credit.status !== "complete")
        .slice(0, 3)
        .map(credit => submission_readiness_engine_1.submissionReadinessEngine.generateContextString(credit, ctx.documents))
        .join("\n");
    if (topPendingEvaluated) {
        creditLines.push(`Submission readiness:`);
        creditLines.push(topPendingEvaluated);
    }
    const strategy = certification_strategy_engine_1.certificationStrategyEngine.getStrategy(ctx.credits);
    creditLines.push(`Certification strategy:`);
    creditLines.push(certification_strategy_engine_1.certificationStrategyEngine.generateContextString(strategy));
    // Full credit matrix — gives Harita complete awareness of every credit
    creditLines.push(`Full credit status matrix:`);
    creditLines.push(`(All ${ctx.credits.length} credits loaded. NA=Not Required/Not Applicable for this project.)`);
    creditLines.push(`CODE | NAME | STATUS | MAX_PTS | NA | COMPLETION%`);
    for (const c of ctx.credits) {
        const maxPts = (_k = c.max_points) !== null && _k !== void 0 ? _k : 0;
        const na = c.na ? "YES" : "NO";
        const pct = c.completion_pct != null ? `${c.completion_pct}%` : "0%";
        creditLines.push(`${c.credit_code} | ${(_l = c.credit_name) !== null && _l !== void 0 ? _l : ""} | ${c.status} | ${maxPts} | ${na} | ${pct}`);
    }
    if (ctx.guidebooks.length) {
        for (const guidebook of ctx.guidebooks.slice(0, 5)) {
            guidebookLines.push(`${guidebook.title || guidebook.file_name} | uploaded_at=${(_m = guidebook.created_at) !== null && _m !== void 0 ? _m : "unknown"}`);
        }
    }
    else {
        guidebookLines.push(`No guidebook metadata found.`);
    }
    return [
        `<project_database_current_state>`,
        ...projectLines,
        `</project_database_current_state>`,
        ``,
        `<authoritative_igbc_guidebook_rules>`,
        ...guidebookLines,
        `</authoritative_igbc_guidebook_rules>`,
        ``,
        `<uploaded_document_variables>`,
        ...documentLines,
        `</uploaded_document_variables>`,
        ``,
        `<project_credit_execution_matrix>`,
        ...creditLines,
        `</project_credit_execution_matrix>`,
    ].join("\n");
}
