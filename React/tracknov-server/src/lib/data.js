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
exports.getUserBlockerQueue = exports.getUserReviewQueue = exports.getUserActionQueue = exports.getRuntimeDesyncSummary = exports.getRoleTasks = exports.getExecutiveInsights = exports.getOwnerReviewQueue = exports.getProjectWorkspace = exports.getDashboardProjects = exports.getTasksForUser = exports.getCurrentUser = void 0;
exports.getProjectWorkspaceForApi = getProjectWorkspaceForApi;
exports.getSubmissionWorkspace = getSubmissionWorkspace;
exports.creditStats = creditStats;
exports.getActiveSubscriptionPlans = getActiveSubscriptionPlans;
exports.getOrCreateOnboardingChecklist = getOrCreateOnboardingChecklist;
exports.updateOnboardingChecklistForCurrentUser = updateOnboardingChecklistForCurrentUser;
exports.updateProjectForCurrentUser = updateProjectForCurrentUser;
exports.updateProjectBillingSettingsForCurrentUser = updateProjectBillingSettingsForCurrentUser;
exports.logConsultantSessionForCurrentUser = logConsultantSessionForCurrentUser;
exports.createProjectTopupInvoiceForCurrentUser = createProjectTopupInvoiceForCurrentUser;
exports.deleteProjectForCurrentUser = deleteProjectForCurrentUser;
exports.getDocumentLibrary = getDocumentLibrary;
exports.getDocumentUploadOptions = getDocumentUploadOptions;
exports.getTeamMembers = getTeamMembers;
exports.getReviewerPerformanceSummary = getReviewerPerformanceSummary;
exports.getAuditTimeline = getAuditTimeline;
exports.getMyRoleTasks = getMyRoleTasks;
exports.getSuperUserCommandCenter = getSuperUserCommandCenter;
exports.getBurnRateForecast = getBurnRateForecast;
exports.getVendorIntelligence = getVendorIntelligence;
exports.getRatingSystems = getRatingSystems;
const uuid_1 = require("uuid");
const cookies = () => ({ get: () => ({ value: "dummy" }), getAll: () => [], set: () => { } });
function cache(fn) {
    return (...args) => fn(...args);
}
function unstable_cache(fn, _keyParts, _options) {
    return (...args) => fn(...args);
}
const constants_1 = require("@/lib/constants");
const env_1 = require("@/lib/env");
const rbac_1 = require("@/lib/rbac");
const admin_1 = require("@/lib/supabase/admin");
const server_1 = require("@/lib/supabase/server");
const state_renderer_1 = require("@/lib/core/workflow/state-renderer");
const greenInteriorsSystem = "IGBC Green Interiors";
function normalizeRole(role) {
    if (role === "superuser")
        return "super_user";
    if (role === "admin")
        return "super_admin";
    const upper = role.toUpperCase();
    if (upper === "L0" || upper === "L1" || upper === "L2" || upper === "L3" || upper === "L4" || upper === "L5") {
        return upper;
    }
    const supported = ["super_user", "l4_reserved", "owner", "client", "consultant", "architect", "mep", "contractor", "project_admin", "super_admin"];
    return supported.includes(role) ? role : "consultant";
}
function normalizeProjectStatus(status) {
    return status === "on_hold" || status === "completed" || status === "archived" ? status : "active";
}
function normalizeProjectType(type) {
    const supported = ["residential", "commercial", "industrial", "infrastructure", "mixed_use"];
    return supported.includes(type !== null && type !== void 0 ? type : "") ? type : "commercial";
}
function normalizeWorkflowState(state, legacyStatus) {
    const raw = String(state !== null && state !== void 0 ? state : "").toUpperCase();
    // Aligned backend states mapped to canonical frontend states:
    if (raw === "ASSIGNED" || raw === "IN_PROGRESS")
        return "DRAFT";
    if (raw === "MAPPED" || raw === "READY_FOR_L3")
        return "READY";
    if (raw === "L1_REVIEW")
        return "SUBMITTED";
    if (raw === "L1_REJECTED" || raw === "REVOKED")
        return "REJECTED";
    if (raw === "UNDER_L3_REVIEW")
        return "UNDER_REVIEW";
    if (raw === "DRAFT" ||
        raw === "READY" ||
        raw === "SUBMITTED" ||
        raw === "UNDER_REVIEW" ||
        raw === "CLARIFICATION" ||
        raw === "RESUBMITTED" ||
        raw === "APPROVED" ||
        raw === "REJECTED" ||
        raw === "ELIMINATED") {
        return raw;
    }
    const legacy = String(legacyStatus !== null && legacyStatus !== void 0 ? legacyStatus : "").toLowerCase();
    if (legacy === "owner_approved")
        return "UNDER_REVIEW";
    if (legacy === "approved")
        return "APPROVED";
    if (legacy === "rejected")
        return "REJECTED";
    return "READY";
}
function workflowToLegacyStatus(state) {
    if (state === "CLARIFICATION" || state === "REJECTED" || state === "ELIMINATED")
        return "rejected";
    if (state === "UNDER_REVIEW")
        return "owner_approved";
    if (state === "APPROVED")
        return "approved";
    return "uploaded";
}
function normalizeDocumentsRequired(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
        type: typeof item.type === "string" ? item.type : "",
        label: typeof item.label === "string" ? item.label : (typeof item.type === "string" ? item.type : "Document"),
        requirement: typeof item.requirement === "string" ? item.requirement : (item.required ? "Required" : "NA"),
        required: Boolean(item.required),
        assigned_user_id: typeof item.assigned_user_id === "string" ? item.assigned_user_id : null,
        assigned_role: item.assigned_role ? normalizeRole(item.assigned_role) : null,
        assigned_email: typeof item.assigned_email === "string" ? item.assigned_email : null,
        assigned_name: typeof item.assigned_name === "string" ? item.assigned_name : null,
    }))
        .filter((item) => Boolean(item.type));
}
function deriveCreditLifecycleState(credit, documents) {
    const normalizedRequirements = normalizeDocumentsRequired(credit.documents_required);
    const requiredTypes = new Set(normalizedRequirements
        .filter((entry) => entry.required && entry.type)
        .map((entry) => entry.type));
    const states = documents.map((document) => normalizeWorkflowState(document.state, document.status));
    const approvedTypes = new Set(documents
        .filter((document) => normalizeWorkflowState(document.state, document.status) === "APPROVED")
        .map((document) => { var _a; return String((_a = document.doc_category) !== null && _a !== void 0 ? _a : "").trim(); })
        .filter(Boolean));
    const completionPct = requiredTypes.size
        ? Math.round((Array.from(requiredTypes).filter((type) => approvedTypes.has(type)).length / requiredTypes.size) * 100)
        : states.some((state) => state === "APPROVED")
            ? 100
            : states.length
                ? 25
                : 0;
    let status = "pending";
    if (credit.blocked_by) {
        status = "blocked";
    }
    else if (completionPct >= 100) {
        status = "complete";
    }
    else if (states.some((state) => state === "REJECTED" || state === "CLARIFICATION")) {
        status = "blocked";
    }
    else if (states.length > 0) {
        status = "in_progress";
    }
    return { status, completion_pct: completionPct };
}
function mapCredit(credit, documents, remarks, assignments = []) {
    var _a, _b, _c, _d, _e, _f;
    const creditDocuments = documents.filter((document) => document.project_credit_id === credit.id || document.credit_id === credit.id);
    const derivedStatus = (_b = (_a = credit.status) !== null && _a !== void 0 ? _a : credit.state) !== null && _b !== void 0 ? _b : "pending";
    const derivedCompletionPct = Number((_c = credit.completion_pct) !== null && _c !== void 0 ? _c : 0);
    const activeAssignments = assignments.filter((assignment) => assignment.project_credit_id === credit.id && assignment.is_active);
    const normalizedRequirements = normalizeDocumentsRequired(credit.documents_required).map((requirement) => {
        var _a, _b, _c;
        const assignment = activeAssignments.find((item) => { var _a; return String((_a = item.document_type) !== null && _a !== void 0 ? _a : "") === requirement.type; });
        return assignment
            ? Object.assign(Object.assign({}, requirement), { assigned_user_id: (_a = assignment.user_id) !== null && _a !== void 0 ? _a : null, assigned_role: assignment.role ? normalizeRole(assignment.role) : null, assigned_email: (_b = assignment.member_email) !== null && _b !== void 0 ? _b : null, assigned_name: (_c = assignment.full_name) !== null && _c !== void 0 ? _c : null }) : requirement;
    });
    return {
        id: credit.id,
        project_credit_id: (_d = credit.project_credit_id) !== null && _d !== void 0 ? _d : credit.id,
        project_id: credit.project_id,
        assigned_user_id: (_e = credit.assigned_user_id) !== null && _e !== void 0 ? _e : null,
        credit_code: credit.credit_code,
        category: credit.category || (credit.credit_code ? credit.credit_code.split(" ")[0] : null),
        credit_name: credit.credit_name,
        responsible_role: credit.responsible_role ? normalizeRole(credit.responsible_role) : null,
        is_mandatory: credit.is_mandatory,
        documents_required: normalizedRequirements,
        state: derivedStatus,
        status: derivedStatus,
        blocked_by: credit.blocked_by,
        completion_pct: derivedCompletionPct,
        documentation_summary: credit.documentation_summary,
        what_to_submit: credit.what_to_submit,
        sample_document_url: credit.sample_document_url,
        effort_level: credit.effort_level,
        effort_guidance: credit.effort_guidance,
        na: credit.na,
        documents: creditDocuments,
        remarks: remarks.filter((remark) => remark.credit_id === credit.id),
        available_points: Number((_f = credit.max_points) !== null && _f !== void 0 ? _f : 0),
    };
}
function mapProjectGuidebooksWithSignedUrls(signer, guidebooks) {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.all((guidebooks !== null && guidebooks !== void 0 ? guidebooks : []).map((guide) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { data: signed } = yield signer.storage
                .from("project-documents")
                .createSignedUrl(guide.file_path, 60 * 30);
            return Object.assign(Object.assign({}, guide), { signed_url: (_a = signed === null || signed === void 0 ? void 0 : signed.signedUrl) !== null && _a !== void 0 ? _a : null });
        })));
    });
}
const supabaseUserCache = new Map();
function getSupabaseUser(client) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        let cacheKey = "";
        try {
            const cookieStore = yield cookies();
            cacheKey = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join(";");
        }
        catch (e) {
            // cookies() might fail if called outside Request/Response context
        }
        if (cacheKey) {
            const cached = supabaseUserCache.get(cacheKey);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.user;
            }
        }
        const { data } = yield client.auth.getUser();
        const user = (_a = data.user) !== null && _a !== void 0 ? _a : null;
        if (cacheKey) {
            supabaseUserCache.set(cacheKey, { user, expiresAt: Date.now() + 15000 });
        }
        return user;
    });
}
function getProjectMembers(client, projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data: memberships } = yield client
            .from("project_users")
            .select("id, project_id, user_id, role, created_at")
            .eq("project_id", projectId)
            .order("created_at", { ascending: true });
        const rows = memberships !== null && memberships !== void 0 ? memberships : [];
        const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
        const { data: profiles } = userIds.length
            ? yield client.from("profiles").select("user_id, email, full_name").in("user_id", userIds)
            : { data: [] };
        const profileByUserId = new Map((profiles !== null && profiles !== void 0 ? profiles : []).map((profile) => [profile.user_id, profile]));
        return rows.map((row) => {
            var _a, _b, _c, _d;
            return ({
                id: row.id,
                project_id: row.project_id,
                user_id: row.user_id,
                member_email: (_b = (_a = profileByUserId.get(row.user_id)) === null || _a === void 0 ? void 0 : _a.email) !== null && _b !== void 0 ? _b : null,
                full_name: (_d = (_c = profileByUserId.get(row.user_id)) === null || _c === void 0 ? void 0 : _c.full_name) !== null && _d !== void 0 ? _d : null,
                role: normalizeRole(row.role),
                created_at: row.created_at,
            });
        });
    });
}
function getProjectInvites(client, projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data: invites } = yield client
            .from("project_invites")
            .select("id, project_id, email, role, token, created_by, accepted_by, accepted_at, created_at")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false });
        return (invites !== null && invites !== void 0 ? invites : []).map((invite) => ({
            id: invite.id,
            project_id: invite.project_id,
            email: invite.email,
            role: normalizeRole(invite.role),
            token: invite.token,
            created_by: invite.created_by,
            accepted_by: invite.accepted_by,
            accepted_at: invite.accepted_at,
            created_at: invite.created_at,
        }));
    });
}
const userCache = new Map();
function getCurrentUserUncached() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return null;
        }
        const { data: profile } = yield client
            .from("profiles")
            .select("global_role, disabled_at")
            .eq("user_id", user.id)
            .maybeSingle();
        if (profile === null || profile === void 0 ? void 0 : profile.disabled_at) {
            return null;
        }
        if (profile === null || profile === void 0 ? void 0 : profile.global_role) {
            return { id: user.id, email: (_a = user.email) !== null && _a !== void 0 ? _a : "", role: normalizeRole(profile.global_role) };
        }
        const metadataRole = typeof ((_b = user.user_metadata) === null || _b === void 0 ? void 0 : _b.role) === "string"
            ? normalizeRole(user.user_metadata.role)
            : null;
        if (metadataRole) {
            return {
                id: user.id,
                email: (_c = user.email) !== null && _c !== void 0 ? _c : "",
                role: metadataRole,
            };
        }
        const { data: elevatedMembership } = yield client
            .from("project_users")
            .select("role")
            .eq("user_id", user.id)
            .in("role", ["super_user", "super_admin", "project_admin", "admin", "L3", "L5"])
            .limit(1)
            .maybeSingle();
        return {
            id: user.id,
            email: (_d = user.email) !== null && _d !== void 0 ? _d : "",
            role: normalizeRole((_e = elevatedMembership === null || elevatedMembership === void 0 ? void 0 : elevatedMembership.role) !== null && _e !== void 0 ? _e : "consultant"),
        };
    });
}
exports.getCurrentUser = cache(function getCurrentUser() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!env_1.env.isConfigured) {
            return null;
        }
        let cacheKey = "";
        try {
            const cookieStore = yield cookies();
            cacheKey = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join(";");
        }
        catch (e) {
            // cookies() might fail if called outside request context
        }
        if (cacheKey) {
            const cached = userCache.get(cacheKey);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.user;
            }
        }
        const user = yield getCurrentUserUncached();
        if (cacheKey) {
            userCache.set(cacheKey, { user, expiresAt: Date.now() + 15000 });
        }
        return user;
    });
});
exports.getTasksForUser = cache(function getTasksForUser() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!env_1.env.isConfigured)
            return [];
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user)
            return [];
        const { data: tasks } = yield client
            .from("tasks")
            .select("*, projects(name), credits(credit_name, credit_code), task_history(*)")
            .eq("assigned_to", user.id)
            .order("created_at", { ascending: false });
        return (tasks !== null && tasks !== void 0 ? tasks : []).map((task) => {
            var _a;
            return (Object.assign(Object.assign({}, task), { project: Array.isArray(task.projects) ? task.projects[0] : task.projects, credit: Array.isArray(task.credits) ? task.credits[0] : task.credits, history: (_a = task.task_history) !== null && _a !== void 0 ? _a : [] }));
        });
    });
});
exports.getDashboardProjects = cache(function getDashboardProjects() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        if (!env_1.env.isConfigured) {
            return [];
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return [];
        }
        const currentUser = yield (0, exports.getCurrentUser)();
        const activeRole = (_a = currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) !== null && _a !== void 0 ? _a : "consultant";
        const elevatedPortfolioRole = activeRole === "super_user" || activeRole === "super_admin" || activeRole === "project_admin";
        const summaryClient = (elevatedPortfolioRole && env_1.env.supabaseServiceRoleKey)
            ? (0, admin_1.createAdminClient)()
            : client;
        let projectRows = [];
        let userRolesMap = new Map();
        if (elevatedPortfolioRole && env_1.env.supabaseServiceRoleKey) {
            const { data: projects, error } = yield summaryClient
                .from("projects")
                .select("id, name, client, location, project_type, status, green_certification, igbc_variant, certification_type, target_rating, created_at, project_code, health_status")
                .order("created_at", { ascending: false });
            if (error) {
                console.error("[getDashboardProjects] Projects fetch error:", error);
            }
            projectRows = projects !== null && projects !== void 0 ? projects : [];
            projectRows.forEach((p) => userRolesMap.set(p.id, activeRole));
        }
        else {
            const { data: memberships, error: membershipsError } = yield client
                .from("project_users")
                .select("project_id, role")
                .eq("user_id", user.id);
            if (membershipsError) {
                console.error(`[getDashboardProjects] Membership lookup error for ${user.id}:`, membershipsError);
            }
            const fallbackMemberships = (!memberships || memberships.length === 0) && env_1.env.supabaseServiceRoleKey
                ? (yield (0, admin_1.createAdminClient)()
                    .from("project_users")
                    .select("project_id, role")
                    .eq("user_id", user.id)).data
                : null;
            const projectMemberships = (memberships === null || memberships === void 0 ? void 0 : memberships.length) ? memberships : (fallbackMemberships !== null && fallbackMemberships !== void 0 ? fallbackMemberships : []);
            const projectIds = Array.from(new Set(projectMemberships.map((membership) => membership.project_id)));
            projectMemberships.forEach((m) => userRolesMap.set(m.project_id, normalizeRole(m.role)));
            if (projectIds.length > 0) {
                const { data: projects, error: projectsError } = yield summaryClient
                    .from("projects")
                    .select("id, name, client, location, project_type, status, green_certification, igbc_variant, certification_type, target_rating, created_at, project_code, health_status")
                    .in("id", projectIds);
                if (projectsError) {
                    console.error(`[getDashboardProjects] Projects fetch error:`, projectsError);
                }
                projectRows = projects !== null && projects !== void 0 ? projects : [];
            }
        }
        const projectIds = projectRows.map((p) => p.id);
        if (projectIds.length === 0) {
            return [];
        }
        // BATCH FETCH ALL SUB-RESOURCES IN PARALLEL (5 queries max)
        const [usageRowsRes, creditsRowsRes, docRowsRes, memberRowsRes] = yield Promise.all([
            summaryClient
                .from("project_usage_summary")
                .select("project_id, plan_code, plan_name, monthly_price_inr, document_credit_limit, consultant_credit_limit, documents_used, consultant_sessions_used, documents_remaining, consultant_credits_remaining")
                .in("project_id", projectIds),
            summaryClient
                .from("project_credits")
                .select("id, project_id, is_mandatory, status, completion_pct, blocked_by, documents_required")
                .in("project_id", projectIds),
            summaryClient
                .from("project_document")
                .select("project_id, credit_id, state")
                .in("project_id", projectIds),
            summaryClient
                .from("project_users")
                .select("project_id")
                .in("project_id", projectIds),
        ]);
        const usageRows = (_b = usageRowsRes.data) !== null && _b !== void 0 ? _b : [];
        const creditsRows = (_c = creditsRowsRes.data) !== null && _c !== void 0 ? _c : [];
        const docRows = (_d = docRowsRes.data) !== null && _d !== void 0 ? _d : [];
        const memberRows = (_e = memberRowsRes.data) !== null && _e !== void 0 ? _e : [];
        const usageByProjectId = new Map(usageRows.map((row) => [row.project_id, row]));
        // Index credits and documents by project_id
        const creditsByProjectId = new Map();
        creditsRows.forEach((c) => {
            var _a;
            const list = (_a = creditsByProjectId.get(c.project_id)) !== null && _a !== void 0 ? _a : [];
            list.push(c);
            creditsByProjectId.set(c.project_id, list);
        });
        const docsByProjectId = new Map();
        docRows.forEach((d) => {
            var _a;
            const list = (_a = docsByProjectId.get(d.project_id)) !== null && _a !== void 0 ? _a : [];
            list.push(d);
            docsByProjectId.set(d.project_id, list);
        });
        // Index members counts
        const memberCountByProjectId = new Map();
        memberRows.forEach((m) => {
            var _a;
            memberCountByProjectId.set(m.project_id, ((_a = memberCountByProjectId.get(m.project_id)) !== null && _a !== void 0 ? _a : 0) + 1);
        });
        // Batch fetch remarks count
        const creditIds = creditsRows.map((c) => c.id);
        let remarksCountByCreditId = new Map();
        if (creditIds.length > 0) {
            const { data: remarkRows } = yield summaryClient
                .from("remarks")
                .select("credit_id")
                .in("credit_id", creditIds);
            (remarkRows !== null && remarkRows !== void 0 ? remarkRows : []).forEach((r) => {
                var _a;
                remarksCountByCreditId.set(r.credit_id, ((_a = remarksCountByCreditId.get(r.credit_id)) !== null && _a !== void 0 ? _a : 0) + 1);
            });
        }
        // Compile summaries in-memory (No database calls inside this loop)
        const summaries = projectRows.map((project) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
            const projectId = project.id;
            const usage = usageByProjectId.get(projectId);
            const credits = (_a = creditsByProjectId.get(projectId)) !== null && _a !== void 0 ? _a : [];
            const documents = (_b = docsByProjectId.get(projectId)) !== null && _b !== void 0 ? _b : [];
            const membersCount = (_c = memberCountByProjectId.get(projectId)) !== null && _c !== void 0 ? _c : 0;
            const docsCount = documents.length;
            const pendingOwnerCount = documents.filter((d) => d.state === "SUBMITTED").length;
            const pendingAdminCount = documents.filter((d) => d.state === "UNDER_REVIEW").length;
            const pendingReviewsCount = pendingOwnerCount + pendingAdminCount;
            const rejectedCount = documents.filter((d) => d.state === "REJECTED" || d.state === "CLARIFICATION").length;
            // Calculate remarks count for this project's credits
            let openRemarks = 0;
            credits.forEach((c) => {
                var _a;
                openRemarks += (_a = remarksCountByCreditId.get(c.id)) !== null && _a !== void 0 ? _a : 0;
            });
            const getDocumentScore = (state) => {
                if (!state)
                    return 0;
                const upper = state.toUpperCase();
                if (upper === "APPROVED")
                    return 6;
                if (["UNDER_REVIEW", "CLARIFICATION", "REJECTED", "RESUBMITTED"].includes(upper))
                    return 5;
                if (["SUBMITTED", "READY"].includes(upper))
                    return 3;
                return 0;
            };
            let totalN = 0;
            let totalPoints = 0;
            credits.forEach((credit) => {
                const requiredTypes = new Set((credit.documents_required || [])
                    .filter((req) => req.required && req.type)
                    .map((req) => req.type));
                let n = requiredTypes.size;
                const creditDocs = documents.filter((d) => d.project_credit_id === credit.id);
                if (n === 0 && creditDocs.length > 0) {
                    n = creditDocs.length;
                    totalPoints += creditDocs.reduce((acc, doc) => acc + getDocumentScore(doc.state), 0);
                }
                else if (n === 0) {
                    if (String(credit.status).toUpperCase() === "COMPLETE") {
                        n = 1;
                        totalPoints += 6;
                    }
                }
                else {
                    Array.from(requiredTypes).forEach((type) => {
                        const matchingDocs = creditDocs.filter((d) => { var _a; return String((_a = d.doc_category) !== null && _a !== void 0 ? _a : "").trim() === String(type).trim(); });
                        if (matchingDocs.length > 0) {
                            totalPoints += Math.max(...matchingDocs.map((d) => getDocumentScore(d.state)));
                        }
                    });
                }
                totalN += n;
            });
            const overallCompletion = totalN > 0 ? Math.round((totalPoints / (totalN * 6)) * 100) : 0;
            const mandatoryMet = credits.filter((credit) => credit.is_mandatory && String(credit.status).toUpperCase() === "COMPLETE").length;
            const statusFlag = rejectedCount >= 3 || pendingReviewsCount >= 8
                ? "red"
                : rejectedCount >= 1 || pendingReviewsCount >= 3
                    ? "amber"
                    : "green";
            return {
                id: project.id,
                name: project.name,
                client: (_d = project.client) !== null && _d !== void 0 ? _d : "",
                location: (_e = project.location) !== null && _e !== void 0 ? _e : "",
                project_type: normalizeProjectType(project.project_type),
                state: normalizeProjectStatus(project.status),
                status: normalizeProjectStatus(project.status),
                green_certification: (_f = project.green_certification) !== null && _f !== void 0 ? _f : "IGBC",
                igbc_variant: project.igbc_variant === "existing" ? "existing" : "new",
                certification_type: project.certification_type,
                target_rating: project.target_rating,
                created_at: project.created_at,
                projectCode: project.project_code || "N/A",
                role: (_g = userRolesMap.get(projectId)) !== null && _g !== void 0 ? _g : "consultant",
                overallCompletion,
                totalCredits: credits.length,
                uploadedDocs: docsCount,
                mandatoryCreditsMet: mandatoryMet,
                openRemarks,
                membersCount,
                planCode: (_h = usage === null || usage === void 0 ? void 0 : usage.plan_code) !== null && _h !== void 0 ? _h : "starter",
                planName: (_j = usage === null || usage === void 0 ? void 0 : usage.plan_name) !== null && _j !== void 0 ? _j : "Starter",
                monthlyPriceInr: Number((_k = usage === null || usage === void 0 ? void 0 : usage.monthly_price_inr) !== null && _k !== void 0 ? _k : 0),
                documentCreditLimit: Number((_l = usage === null || usage === void 0 ? void 0 : usage.document_credit_limit) !== null && _l !== void 0 ? _l : 0),
                consultantCreditLimit: Number((_m = usage === null || usage === void 0 ? void 0 : usage.consultant_credit_limit) !== null && _m !== void 0 ? _m : 0),
                documentCreditsUsed: Number((_o = usage === null || usage === void 0 ? void 0 : usage.documents_used) !== null && _o !== void 0 ? _o : 0),
                consultantCreditsUsed: Number((_p = usage === null || usage === void 0 ? void 0 : usage.consultant_sessions_used) !== null && _p !== void 0 ? _p : 0),
                documentCreditsRemaining: Number((_q = usage === null || usage === void 0 ? void 0 : usage.documents_remaining) !== null && _q !== void 0 ? _q : 0),
                consultantCreditsRemaining: Number((_r = usage === null || usage === void 0 ? void 0 : usage.consultant_credits_remaining) !== null && _r !== void 0 ? _r : 0),
                pendingReviewsCount,
                rejectedCount,
                statusFlag,
                health_status: project.health_status,
            };
        });
        return summaries;
    });
});
const getCachedProject = (projectId) => unstable_cache(() => __awaiter(void 0, void 0, void 0, function* () {
    const admin = (0, admin_1.createAdminClient)();
    const { data } = yield admin.from("projects").select("*").eq("id", projectId).single();
    return data;
}), [`project-${projectId}`], { revalidate: 60, tags: [`project:${projectId}`] })();
const getCachedGuidebooks = (projectId) => unstable_cache(() => __awaiter(void 0, void 0, void 0, function* () {
    const admin = (0, admin_1.createAdminClient)();
    const { data } = yield admin
        .from("project_guidebooks")
        .select("id, title, file_name, file_path, uploaded_by, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
    return data || [];
}), [`guidebooks-${projectId}`], { revalidate: 60, tags: [`project-guidebooks:${projectId}`] })();
const getCachedValidationRules = (projectId) => unstable_cache(() => __awaiter(void 0, void 0, void 0, function* () {
    const admin = (0, admin_1.createAdminClient)();
    const { data } = yield admin
        .from("validation_rules")
        .select("id, project_credit_id, credit_id, doc_category, rule_name, required_keywords, severity, is_active, created_at")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(200);
    return data || [];
}), [`validation-rules-${projectId}`], { revalidate: 60, tags: [`project-validation-rules:${projectId}`] })();
const getCachedDataTables = (projectId) => unstable_cache(() => __awaiter(void 0, void 0, void 0, function* () {
    const admin = (0, admin_1.createAdminClient)();
    const { data } = yield admin
        .from("project_data_tables")
        .select("id, title, file_name, file_path, uploaded_by, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
    return data || [];
}), [`data-tables-${projectId}`], { revalidate: 60, tags: [`project-data-tables:${projectId}`] })();
exports.getProjectWorkspace = cache(function getProjectWorkspace(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!env_1.env.isConfigured) {
            return null;
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return null;
        }
        const currentUser = yield (0, exports.getCurrentUser)();
        if (((currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === "super_user" || (currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === "L5") && env_1.env.supabaseServiceRoleKey) {
            const admin = (0, admin_1.createAdminClient)();
            const [project, { data: credits }, { data: documents }, { data: notifications }, { data: activityLogs }, guidebooks, validationRules, { data: assignments }, { data: tasks }, { data: history }, dataTables, members, invites] = yield Promise.all([
                getCachedProject(projectId),
                admin.from("project_credits").select("*").eq("project_id", projectId).order("credit_code"),
                admin
                    .from("project_document")
                    .select("*")
                    .eq("project_id", projectId)
                    .order("uploaded_at", { ascending: false }),
                admin
                    .from("notifications")
                    .select("id, body, action_url, created_at, read_at")
                    .eq("user_id", user.id)
                    .eq("project_id", projectId)
                    .order("created_at", { ascending: false }),
                admin
                    .from("system_activity_logs")
                    .select("id, project_id, entity_type, entity_id, action, actor_id, actor_role, summary, details, created_at")
                    .eq("project_id", projectId)
                    .order("created_at", { ascending: false })
                    .limit(25),
                getCachedGuidebooks(projectId),
                getCachedValidationRules(projectId),
                admin
                    .from("assignments")
                    .select("id, project_id, project_credit_id, document_type, user_id, role, is_active")
                    .eq("project_id", projectId)
                    .eq("is_active", true),
                admin.from("tasks").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
                admin.from("task_history").select("*").order("created_at", { ascending: true }),
                getCachedDataTables(projectId),
                getProjectMembers(admin, projectId),
                getProjectInvites(admin, projectId),
            ]);
            const documentIds = (documents !== null && documents !== void 0 ? documents : []).map((d) => d.id);
            const { data: documentIntelligence } = documentIds.length
                ? yield admin.from("document_intelligence").select("*").in("document_id", documentIds)
                : { data: [] };
            const docsWithIntelligence = (documents !== null && documents !== void 0 ? documents : []).map((doc) => {
                const intel = (documentIntelligence !== null && documentIntelligence !== void 0 ? documentIntelligence : []).find((i) => i.document_id === doc.id);
                if (intel) {
                    return Object.assign(Object.assign({}, doc), { intelligence: {
                            evidence_type: intel.evidence_type,
                            suggested_credits: intel.suggested_credits,
                            responsible_roles: intel.responsible_roles,
                            summary: intel.summary,
                        } });
                }
                return doc;
            });
            const effectiveCredits = (credits !== null && credits !== void 0 ? credits : []);
            const creditIds = effectiveCredits.map((credit) => credit.id);
            const { data: remarks } = creditIds.length
                ? yield admin.from("remarks").select("*").in("credit_id", creditIds).order("created_at", { ascending: false })
                : { data: [] };
            const memberByUserId = new Map(members.map((member) => [member.user_id, member]));
            const mappedAssignments = (assignments !== null && assignments !== void 0 ? assignments : []).map((assignment) => {
                var _a, _b, _c, _d;
                return (Object.assign(Object.assign({}, assignment), { member_email: (_b = (_a = memberByUserId.get(assignment.user_id)) === null || _a === void 0 ? void 0 : _a.member_email) !== null && _b !== void 0 ? _b : null, full_name: (_d = (_c = memberByUserId.get(assignment.user_id)) === null || _c === void 0 ? void 0 : _c.full_name) !== null && _d !== void 0 ? _d : null }));
            });
            const mappedCredits = effectiveCredits.map((credit) => mapCredit(credit, docsWithIntelligence, remarks !== null && remarks !== void 0 ? remarks : [], mappedAssignments));
            const mappedGuidebooks = yield mapProjectGuidebooksWithSignedUrls(admin, guidebooks !== null && guidebooks !== void 0 ? guidebooks : []);
            const mappedDataTables = yield mapProjectGuidebooksWithSignedUrls(admin, dataTables !== null && dataTables !== void 0 ? dataTables : []);
            return {
                project,
                userRole: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) || "super_user",
                credits: mappedCredits,
                guidebooks: mappedGuidebooks,
                data_tables: mappedDataTables,
                validationRules: (validationRules !== null && validationRules !== void 0 ? validationRules : []),
                members,
                invites,
                notifications: notifications !== null && notifications !== void 0 ? notifications : [],
                tasks: (tasks !== null && tasks !== void 0 ? tasks : []).map(task => (Object.assign(Object.assign({}, task), { history: (history !== null && history !== void 0 ? history : []).filter(h => h.task_id === task.id) }))),
                activityLogs: (activityLogs !== null && activityLogs !== void 0 ? activityLogs : []).map((row) => {
                    var _a;
                    return (Object.assign(Object.assign({}, row), { details: (_a = row.details) !== null && _a !== void 0 ? _a : {} }));
                }),
            };
        }
        const admin = (0, admin_1.createAdminClient)();
        const { data: membership, error: memberError } = yield admin
            .from("project_users")
            .select("role")
            .eq("project_id", projectId)
            .eq("user_id", user.id)
            .single();
        if (!membership) {
            return null;
        }
        const [project, { data: credits }, { data: documents }, { data: notifications }, { data: activityLogs }, guidebooks, validationRules, { data: assignments }, { data: tasks }, { data: history }, dataTables, members, invites] = yield Promise.all([
            getCachedProject(projectId),
            client.from("project_credits").select("*").eq("project_id", projectId).order("credit_code"),
            client
                .from("project_document")
                .select("*")
                .eq("project_id", projectId)
                .order("uploaded_at", { ascending: false }),
            client
                .from("notifications")
                .select("id, body, action_url, created_at, read_at")
                .eq("user_id", user.id)
                .eq("project_id", projectId)
                .order("created_at", { ascending: false }),
            client
                .from("system_activity_logs")
                .select("id, project_id, entity_type, entity_id, action, actor_id, actor_role, summary, details, created_at")
                .eq("project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(25),
            getCachedGuidebooks(projectId),
            getCachedValidationRules(projectId),
            admin
                .from("assignments")
                .select("id, project_id, project_credit_id, document_type, user_id, role, is_active")
                .eq("project_id", projectId)
                .eq("is_active", true),
            client.from("tasks").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
            client.from("task_history").select("*").order("created_at", { ascending: true }),
            getCachedDataTables(projectId),
            getProjectMembers(client, projectId),
            getProjectInvites(client, projectId),
        ]);
        const documentIds = (documents !== null && documents !== void 0 ? documents : []).map((d) => d.id);
        const { data: documentIntelligence } = documentIds.length
            ? yield admin.from("document_intelligence").select("*").in("document_id", documentIds)
            : { data: [] };
        const docsWithIntelligence = (documents !== null && documents !== void 0 ? documents : []).map((doc) => {
            const intel = (documentIntelligence !== null && documentIntelligence !== void 0 ? documentIntelligence : []).find((i) => i.document_id === doc.id);
            if (intel) {
                return Object.assign(Object.assign({}, doc), { intelligence: {
                        evidence_type: intel.evidence_type,
                        suggested_credits: intel.suggested_credits,
                        responsible_roles: intel.responsible_roles,
                        summary: intel.summary,
                    } });
            }
            return doc;
        });
        const effectiveCredits = (credits !== null && credits !== void 0 ? credits : []);
        const creditIds = effectiveCredits.map((credit) => credit.id);
        const { data: remarks } = creditIds.length
            ? yield client.from("remarks").select("*").in("credit_id", creditIds).order("created_at", { ascending: false })
            : { data: [] };
        const memberByUserId = new Map(members.map((member) => [member.user_id, member]));
        const mappedAssignments = (assignments !== null && assignments !== void 0 ? assignments : []).map((assignment) => {
            var _a, _b, _c, _d;
            return (Object.assign(Object.assign({}, assignment), { member_email: (_b = (_a = memberByUserId.get(assignment.user_id)) === null || _a === void 0 ? void 0 : _a.member_email) !== null && _b !== void 0 ? _b : null, full_name: (_d = (_c = memberByUserId.get(assignment.user_id)) === null || _c === void 0 ? void 0 : _c.full_name) !== null && _d !== void 0 ? _d : null }));
        });
        const mappedCredits = effectiveCredits.map((credit) => mapCredit(credit, docsWithIntelligence, remarks !== null && remarks !== void 0 ? remarks : [], mappedAssignments));
        const mappedGuidebooks = yield mapProjectGuidebooksWithSignedUrls(admin, guidebooks !== null && guidebooks !== void 0 ? guidebooks : []);
        const mappedDataTables = yield mapProjectGuidebooksWithSignedUrls(client, dataTables !== null && dataTables !== void 0 ? dataTables : []);
        const globalLevel = (0, rbac_1.getRoleLevel)(currentUser === null || currentUser === void 0 ? void 0 : currentUser.role);
        const projectLevel = (0, rbac_1.getRoleLevel)(membership.role);
        const effectiveRole = globalLevel >= projectLevel ? currentUser === null || currentUser === void 0 ? void 0 : currentUser.role : normalizeRole(membership.role);
        return {
            project,
            userRole: effectiveRole,
            credits: mappedCredits,
            guidebooks: mappedGuidebooks,
            data_tables: mappedDataTables,
            validationRules: (validationRules !== null && validationRules !== void 0 ? validationRules : []),
            members,
            invites,
            notifications: notifications !== null && notifications !== void 0 ? notifications : [],
            tasks: (tasks !== null && tasks !== void 0 ? tasks : []).map(task => (Object.assign(Object.assign({}, task), { history: (history !== null && history !== void 0 ? history : []).filter(h => h.task_id === task.id) }))),
            activityLogs: (activityLogs !== null && activityLogs !== void 0 ? activityLogs : []).map((row) => {
                var _a;
                return (Object.assign(Object.assign({}, row), { details: (_a = row.details) !== null && _a !== void 0 ? _a : {} }));
            }),
        };
    });
});
function getProjectWorkspaceForApi(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!env_1.env.isConfigured) {
            return null;
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return null;
        }
        const currentUser = yield (0, exports.getCurrentUser)();
        if ((currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === "super_user") {
            return (0, exports.getProjectWorkspace)(projectId);
        }
        const { data: membership } = yield client
            .from("project_users")
            .select("id")
            .eq("project_id", projectId)
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();
        if (!membership) {
            return null;
        }
        return (0, exports.getProjectWorkspace)(projectId);
    });
}
function getSubmissionWorkspace(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const workspace = yield (0, exports.getProjectWorkspace)(projectId);
        if (!workspace)
            return null;
        return Object.assign(Object.assign({}, workspace), { credits: workspace.credits.filter((credit) => credit.status === "complete") });
    });
}
function creditStats(credits) {
    const total = credits.length;
    const mandatory = credits.filter((credit) => credit.is_mandatory);
    const docs = credits.reduce((sum, credit) => sum + credit.documents.length, 0);
    return {
        total,
        docs,
        categories: Object.entries(constants_1.categoryMeta).map(([key, meta]) => {
            const categoryCredits = credits.filter((credit) => credit.category === key);
            const completed = categoryCredits.filter((credit) => credit.status === "complete").length;
            const inProgress = categoryCredits.filter((credit) => credit.status === "in_progress").length;
            const blocked = categoryCredits.filter((credit) => credit.status === "blocked").length;
            let totalN = 0;
            let totalPoints = 0;
            const getDocumentScore = (state) => {
                if (!state)
                    return 0;
                const upper = state.toUpperCase();
                if (upper === "APPROVED")
                    return 6;
                if (["UNDER_REVIEW", "CLARIFICATION", "REJECTED", "RESUBMITTED"].includes(upper))
                    return 5;
                if (["SUBMITTED", "READY"].includes(upper))
                    return 3;
                return 0;
            };
            categoryCredits.forEach((credit) => {
                const requiredTypes = new Set((credit.documents_required || [])
                    .filter((req) => req.required && req.type)
                    .map((req) => req.type));
                let n = requiredTypes.size;
                const uploadedDocs = credit.documents || [];
                if (n === 0 && uploadedDocs.length > 0) {
                    n = uploadedDocs.length;
                    totalPoints += uploadedDocs.reduce((acc, doc) => acc + getDocumentScore(doc.state), 0);
                }
                else if (n === 0) {
                    if (String(credit.status).toUpperCase() === "COMPLETE") {
                        n = 1;
                        totalPoints += 6;
                    }
                }
                else {
                    Array.from(requiredTypes).forEach((type) => {
                        const matchingDocs = uploadedDocs.filter((d) => { var _a; return String((_a = d.doc_category) !== null && _a !== void 0 ? _a : "").trim() === String(type).trim(); });
                        if (matchingDocs.length > 0) {
                            totalPoints += Math.max(...matchingDocs.map((d) => getDocumentScore(d.state)));
                        }
                    });
                }
                totalN += n;
            });
            const avgCompletion = totalN > 0 ? Math.round((totalPoints / (totalN * 6)) * 100) : 0;
            return {
                key,
                label: meta.label,
                count: categoryCredits.length,
                completed,
                inProgress,
                blocked,
                avgCompletion,
            };
        }),
        mandatoryMet: mandatory.filter((credit) => credit.status === "complete").length,
        mandatoryTotal: mandatory.length,
    };
}
function getActiveSubscriptionPlans() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!env_1.env.isConfigured) {
            return [];
        }
        const client = (0, server_1.createClient)();
        const { data } = yield client
            .from("subscription_plans")
            .select("code, name, monthly_price_inr, document_credit_limit, consultant_credit_limit")
            .eq("is_active", true)
            .order("monthly_price_inr", { ascending: true });
        return (data !== null && data !== void 0 ? data : []);
    });
}
const defaultOnboardingChecklist = {
    profile_completed: false,
    project_scope_confirmed: false,
    first_document_uploaded: false,
    first_review_completed: false,
};
function getOrCreateOnboardingChecklist(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!env_1.env.isConfigured) {
            return null;
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return null;
        }
        const { data: existing } = yield client
            .from("onboarding_checklists")
            .select("id, checklist, completed_at")
            .eq("user_id", user.id)
            .eq("project_id", projectId)
            .maybeSingle();
        if (existing) {
            return {
                id: existing.id,
                checklist: Object.assign(Object.assign({}, defaultOnboardingChecklist), ((_a = existing.checklist) !== null && _a !== void 0 ? _a : {})),
                completedAt: existing.completed_at,
            };
        }
        const { data: inserted, error } = yield client
            .from("onboarding_checklists")
            .insert({
            user_id: user.id,
            project_id: projectId,
            checklist: defaultOnboardingChecklist,
        })
            .select("id, checklist, completed_at")
            .single();
        if (error || !inserted) {
            return null;
        }
        return {
            id: inserted.id,
            checklist: Object.assign(Object.assign({}, defaultOnboardingChecklist), ((_b = inserted.checklist) !== null && _b !== void 0 ? _b : {})),
            completedAt: inserted.completed_at,
        };
    });
}
function updateOnboardingChecklistForCurrentUser(projectId, key, value) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!env_1.env.isConfigured) {
            return;
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return;
        }
        const existing = yield getOrCreateOnboardingChecklist(projectId);
        if (!existing) {
            return;
        }
        const nextChecklist = Object.assign(Object.assign({}, existing.checklist), { [key]: value });
        const completed = Object.values(nextChecklist).every(Boolean);
        yield client
            .from("onboarding_checklists")
            .update({
            checklist: nextChecklist,
            completed_at: completed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
        })
            .eq("id", existing.id);
    });
}
function getMembershipRoleForProject(client, userId, projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { data: membership } = yield client
            .from("project_users")
            .select("role")
            .eq("user_id", userId)
            .eq("project_id", projectId)
            .limit(1)
            .maybeSingle();
        return normalizeRole((_a = membership === null || membership === void 0 ? void 0 : membership.role) !== null && _a !== void 0 ? _a : "consultant");
    });
}
function updateProjectForCurrentUser(_a) {
    return __awaiter(this, arguments, void 0, function* ({ projectId, name, clientName, location, ratingSystem, status, }) {
        if (!env_1.env.isConfigured) {
            return;
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return;
        }
        const currentUser = yield (0, exports.getCurrentUser)();
        const projectRole = (currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === "super_user"
            ? "super_user"
            : yield getMembershipRoleForProject(client, user.id, projectId);
        if (!(0, rbac_1.canManageProject)(projectRole)) {
            return;
        }
        const elevatedClient = env_1.env.supabaseServiceRoleKey && (0, rbac_1.canManageProject)(projectRole) ? (0, admin_1.createAdminClient)() : client;
        const safeRatingSystem = constants_1.igbcRatingSystems.includes(ratingSystem) ? ratingSystem : greenInteriorsSystem;
        const { error } = yield elevatedClient
            .from("projects")
            .update({
            name,
            client: clientName,
            location,
            certification_type: safeRatingSystem,
            status,
        })
            .eq("id", projectId);
        if (error) {
            throw error;
        }
    });
}
function updateProjectBillingSettingsForCurrentUser(_a) {
    return __awaiter(this, arguments, void 0, function* ({ projectId, planCode, documentCreditLimit, consultantCreditLimit, topupDocumentCredits, topupConsultantCredits, }) {
        if (!env_1.env.isConfigured) {
            return;
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return;
        }
        const currentUser = yield (0, exports.getCurrentUser)();
        const projectRole = (currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === "super_user"
            ? "super_user"
            : yield getMembershipRoleForProject(client, user.id, projectId);
        if (!(0, rbac_1.canManageProject)(projectRole)) {
            return;
        }
        const elevatedClient = env_1.env.supabaseServiceRoleKey && (0, rbac_1.canManageProject)(projectRole) ? (0, admin_1.createAdminClient)() : client;
        const { error } = yield elevatedClient.from("project_billing_settings").upsert({
            project_id: projectId,
            plan_code: planCode,
            document_credit_limit: Math.max(0, Math.trunc(documentCreditLimit)),
            consultant_credit_limit: Math.max(0, Math.trunc(consultantCreditLimit)),
            topup_document_credits: Math.max(0, Math.trunc(topupDocumentCredits)),
            topup_consultant_credits: Math.max(0, Math.trunc(topupConsultantCredits)),
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        }, { onConflict: "project_id" });
        if (error) {
            throw error;
        }
    });
}
function logConsultantSessionForCurrentUser(_a) {
    return __awaiter(this, arguments, void 0, function* ({ projectId, source, notes, creditsBurned, }) {
        var _b, _c, _d;
        if (!env_1.env.isConfigured) {
            return;
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return;
        }
        const currentUser = yield (0, exports.getCurrentUser)();
        const projectRole = (currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === "super_user"
            ? "super_user"
            : yield getMembershipRoleForProject(client, user.id, projectId);
        if (!projectRole) {
            return;
        }
        const elevatedClient = env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : client;
        const { data: usage } = yield elevatedClient
            .from("project_usage_summary")
            .select("consultant_credit_limit, topup_consultant_credits, consultant_sessions_used")
            .eq("project_id", projectId)
            .maybeSingle();
        const totalCredits = Number((_b = usage === null || usage === void 0 ? void 0 : usage.consultant_credit_limit) !== null && _b !== void 0 ? _b : 0) + Number((_c = usage === null || usage === void 0 ? void 0 : usage.topup_consultant_credits) !== null && _c !== void 0 ? _c : 0);
        const usedCredits = Number((_d = usage === null || usage === void 0 ? void 0 : usage.consultant_sessions_used) !== null && _d !== void 0 ? _d : 0);
        const burn = Math.max(1, Math.trunc(creditsBurned || 1));
        if (totalCredits > 0 && usedCredits + burn > totalCredits) {
            throw new Error("Consultant credit limit reached. Add consultant top-up credits or update plan quota.");
        }
        const { error } = yield elevatedClient.from("consultant_sessions").insert({
            project_id: projectId,
            actor_id: user.id,
            source: source || "manual",
            notes: notes || "",
            credits_burned: burn,
        });
        if (error) {
            throw error;
        }
    });
}
function createProjectTopupInvoiceForCurrentUser(_a) {
    return __awaiter(this, arguments, void 0, function* ({ projectId, documentCredits, consultantCredits, amountInr, notes, }) {
        var _b, _c;
        if (!env_1.env.isConfigured) {
            return;
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return;
        }
        const currentUser = yield (0, exports.getCurrentUser)();
        const projectRole = (currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === "super_user"
            ? "super_user"
            : yield getMembershipRoleForProject(client, user.id, projectId);
        if (!(0, rbac_1.canManageProject)(projectRole)) {
            return;
        }
        const elevatedClient = env_1.env.supabaseServiceRoleKey && (0, rbac_1.canManageProject)(projectRole) ? (0, admin_1.createAdminClient)() : client;
        const docTopup = Math.max(0, Math.trunc(documentCredits || 0));
        const consultantTopup = Math.max(0, Math.trunc(consultantCredits || 0));
        const safeAmount = Number(Math.max(0, amountInr || 0).toFixed(2));
        if (docTopup === 0 && consultantTopup === 0) {
            throw new Error("Top-up credits are required.");
        }
        const { data: existingSettings } = yield elevatedClient
            .from("project_billing_settings")
            .select("project_id, topup_document_credits, topup_consultant_credits")
            .eq("project_id", projectId)
            .maybeSingle();
        const nextDocTopup = Number((_b = existingSettings === null || existingSettings === void 0 ? void 0 : existingSettings.topup_document_credits) !== null && _b !== void 0 ? _b : 0) + docTopup;
        const nextConsultantTopup = Number((_c = existingSettings === null || existingSettings === void 0 ? void 0 : existingSettings.topup_consultant_credits) !== null && _c !== void 0 ? _c : 0) + consultantTopup;
        const { error: settingsError } = yield elevatedClient
            .from("project_billing_settings")
            .update({
            topup_document_credits: nextDocTopup,
            topup_consultant_credits: nextConsultantTopup,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        })
            .eq("project_id", projectId);
        if (settingsError) {
            throw settingsError;
        }
        const { error: topupError } = yield elevatedClient.from("project_topups").insert({
            project_id: projectId,
            document_credits: docTopup,
            consultant_credits: consultantTopup,
            amount_inr: safeAmount,
            notes: notes || "",
            created_by: user.id,
        });
        if (topupError) {
            throw topupError;
        }
        const now = new Date();
        const invoiceNumber = `TRK-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${(0, uuid_1.v4)().slice(0, 8).toUpperCase()}`;
        const lineItems = [
            {
                item: "Document credit top-up",
                quantity: docTopup,
                unit: "credits",
            },
            {
                item: "Consultant credit top-up",
                quantity: consultantTopup,
                unit: "credits",
            },
        ].filter((item) => item.quantity > 0);
        const dueAt = new Date(now);
        dueAt.setDate(now.getDate() + 15);
        const { error: invoiceError } = yield elevatedClient.from("billing_invoices").insert({
            project_id: projectId,
            invoice_number: invoiceNumber,
            status: "issued",
            line_items: lineItems,
            subtotal_inr: safeAmount,
            tax_inr: 0,
            total_inr: safeAmount,
            currency: "INR",
            issued_at: now.toISOString(),
            due_at: dueAt.toISOString(),
            created_by: user.id,
        });
        if (invoiceError) {
            throw invoiceError;
        }
    });
}
function deleteProjectForCurrentUser(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!env_1.env.isConfigured) {
            return;
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return;
        }
        const currentUser = yield (0, exports.getCurrentUser)();
        if (!(0, rbac_1.canDeleteProjects)(currentUser === null || currentUser === void 0 ? void 0 : currentUser.role)) {
            return;
        }
        const elevatedClient = env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : client;
        const { error } = yield elevatedClient.from("projects").delete().eq("id", projectId);
        if (error) {
            throw error;
        }
    });
}
function getDocumentLibrary() {
    return __awaiter(this, arguments, void 0, function* (filters = {}) {
        var _a, _b, _c;
        if (!env_1.env.isConfigured) {
            return [];
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return [];
        }
        const currentUser = yield (0, exports.getCurrentUser)();
        let query = client.from("project_document").select("*").order("uploaded_at", { ascending: false });
        if (filters.project) {
            query = query.eq("project_id", filters.project);
        }
        const { data: documents } = yield query;
        const rows = (documents !== null && documents !== void 0 ? documents : []);
        const projectIds = Array.from(new Set(rows.map((document) => document.project_id).filter(Boolean)));
        const creditIds = Array.from(new Set(rows.map((document) => document.credit_id).filter(Boolean)));
        const uploadedByIds = Array.from(new Set(rows.map((document) => document.uploaded_by).filter(Boolean)));
        const [{ data: projects }, { data: credits }, { data: uploaderProfiles }, { data: memberships }] = yield Promise.all([
            projectIds.length
                ? client.from("projects").select("id, name").in("id", projectIds)
                : Promise.resolve({ data: [] }),
            creditIds.length
                ? client
                    .from("project_credits")
                    .select("id, credit_code, credit_name, what_to_submit, sample_document_url")
                    .in("id", creditIds)
                : Promise.resolve({ data: [] }),
            uploadedByIds.length
                ? client.from("profiles").select("user_id, full_name, email").in("user_id", uploadedByIds)
                : Promise.resolve({ data: [] }),
            (currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === "super_user"
                ? Promise.resolve({ data: [] })
                : projectIds.length
                    ? client
                        .from("project_users")
                        .select("project_id, role")
                        .eq("user_id", user.id)
                        .in("project_id", projectIds)
                    : Promise.resolve({ data: [] }),
        ]);
        const projectsById = new Map((projects !== null && projects !== void 0 ? projects : []).map((project) => [project.id, project]));
        const creditsById = new Map((credits !== null && credits !== void 0 ? credits : []).map((credit) => [credit.id, credit]));
        const uploadersById = new Map((uploaderProfiles !== null && uploaderProfiles !== void 0 ? uploaderProfiles : []).map((profile) => {
            var _a, _b;
            return [
                profile.user_id,
                (_b = (_a = profile.full_name) !== null && _a !== void 0 ? _a : profile.email) !== null && _b !== void 0 ? _b : "Project member",
            ];
        }));
        const roleByProjectId = new Map((memberships !== null && memberships !== void 0 ? memberships : []).map((membership) => [membership.project_id, normalizeRole(membership.role)]));
        const documentRoleView = rows.map((document) => {
            var _a, _b;
            const projectRole = (currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === "super_user"
                ? "super_user"
                : (_b = (_a = roleByProjectId.get(document.project_id)) !== null && _a !== void 0 ? _a : currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) !== null && _b !== void 0 ? _b : "consultant";
            return {
                document,
                projectRole,
                canViewLogs: projectRole === "super_user" || projectRole === "project_admin",
            };
        });
        const logDocumentIds = documentRoleView.filter((item) => item.canViewLogs).map((item) => item.document.id);
        const { data: activityLogs } = logDocumentIds.length
            ? yield client
                .from("document_activity_logs")
                .select("id, document_id, project_id, action, actor_id, actor_role, summary, details, created_at")
                .in("document_id", logDocumentIds)
                .order("created_at", { ascending: false })
                .limit(400)
            : { data: [] };
        const activityRows = (activityLogs !== null && activityLogs !== void 0 ? activityLogs : []);
        const activityActorIds = Array.from(new Set(activityRows.map((log) => log.actor_id).filter(Boolean)));
        const { data: activityActorProfiles } = activityActorIds.length
            ? yield client.from("profiles").select("user_id, full_name, email").in("user_id", activityActorIds)
            : { data: [] };
        const activityActorsById = new Map((activityActorProfiles !== null && activityActorProfiles !== void 0 ? activityActorProfiles : []).map((profile) => {
            var _a, _b;
            return [
                profile.user_id,
                (_b = (_a = profile.full_name) !== null && _a !== void 0 ? _a : profile.email) !== null && _b !== void 0 ? _b : "Project member",
            ];
        }));
        const activityByDocumentId = new Map();
        for (const row of activityRows) {
            const existing = (_a = activityByDocumentId.get(row.document_id)) !== null && _a !== void 0 ? _a : [];
            existing.push(Object.assign(Object.assign({}, row), { actor_name: row.actor_id ? (_b = activityActorsById.get(row.actor_id)) !== null && _b !== void 0 ? _b : null : null, details: ((_c = row.details) !== null && _c !== void 0 ? _c : {}) }));
            activityByDocumentId.set(row.document_id, existing);
        }
        return filterDocuments(documentRoleView.map(({ document, projectRole, canViewLogs }) => {
            var _a, _b, _c, _d, _e, _f, _g;
            const project = projectsById.get(document.project_id);
            const credit = document.credit_id ? creditsById.get(document.credit_id) : null;
            const workflowState = normalizeWorkflowState(document.state, document.status);
            const normalizedStatus = workflowToLegacyStatus(workflowState);
            const canEditStatus = (0, rbac_1.canEditDocumentStatusAtAnyStage)(projectRole);
            const canEditMetadata = canEditStatus ||
                Boolean(document.uploaded_by &&
                    document.uploaded_by === user.id &&
                    (workflowState === "DRAFT" || workflowState === "READY" || workflowState === "CLARIFICATION") &&
                    (0, rbac_1.canEditOwnDocumentBeforeFinalApproval)(projectRole));
            return Object.assign(Object.assign({}, document), { status: normalizedStatus, state: workflowState, project_name: (_a = project === null || project === void 0 ? void 0 : project.name) !== null && _a !== void 0 ? _a : "Untitled project", credit_code: (_b = credit === null || credit === void 0 ? void 0 : credit.credit_code) !== null && _b !== void 0 ? _b : null, credit_name: (_c = credit === null || credit === void 0 ? void 0 : credit.credit_name) !== null && _c !== void 0 ? _c : null, credit_what_to_submit: (_d = credit === null || credit === void 0 ? void 0 : credit.what_to_submit) !== null && _d !== void 0 ? _d : null, credit_sample_document_url: (_e = credit === null || credit === void 0 ? void 0 : credit.sample_document_url) !== null && _e !== void 0 ? _e : null, uploaded_by_name: document.uploaded_by ? (_f = uploadersById.get(document.uploaded_by)) !== null && _f !== void 0 ? _f : null : null, project_role: projectRole, can_edit_metadata: canEditMetadata, can_edit_status: canEditStatus, can_reject: canEditStatus || projectRole === "owner", can_delete: projectRole === "super_user" ||
                    projectRole === "super_admin" ||
                    projectRole === "project_admin", can_view_logs: canViewLogs, activity_logs: canViewLogs ? (_g = activityByDocumentId.get(document.id)) !== null && _g !== void 0 ? _g : [] : [] });
        }), filters);
    });
}
function getDocumentUploadOptions() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        const projects = yield (0, exports.getDashboardProjects)();
        const uploadableProjects = projects.filter(p => (0, rbac_1.canUploadProjectDocuments)(p.role));
        if (!uploadableProjects.length) {
            return [];
        }
        const client = (0, server_1.createClient)();
        const user = yield (0, exports.getCurrentUser)();
        const projectIds = uploadableProjects.map((project) => project.id);
        const [{ data: projectCredits }, { data: historicalDocs }] = yield Promise.all([
            client
                .from("project_credits")
                .select("id, project_id, status, credit:credits(id, credit_code, credit_name, documents_required, what_to_submit)")
                .in("project_id", projectIds)
                .order("created_at"),
            user
                ? client
                    .from("project_document")
                    .select("credit_id, doc_category, file_name, status, uploaded_by")
                    .eq("uploaded_by", user.id)
                    .eq("status", "approved")
                    .order("uploaded_at", { ascending: false })
                    .limit(300)
                : Promise.resolve({ data: [] }),
        ]);
        const priorFilesByCreditAndType = new Map();
        for (const doc of historicalDocs !== null && historicalDocs !== void 0 ? historicalDocs : []) {
            const creditId = String((_a = doc.credit_id) !== null && _a !== void 0 ? _a : "").trim();
            const docType = String((_b = doc.doc_category) !== null && _b !== void 0 ? _b : "").trim();
            const fileName = String((_c = doc.file_name) !== null && _c !== void 0 ? _c : "").trim();
            if (!creditId || !docType || !fileName) {
                continue;
            }
            const key = `${creditId}::${docType}`;
            const existing = (_d = priorFilesByCreditAndType.get(key)) !== null && _d !== void 0 ? _d : [];
            if (!existing.includes(fileName)) {
                existing.push(fileName);
            }
            priorFilesByCreditAndType.set(key, existing.slice(0, 3));
        }
        const creditsByProject = new Map();
        for (const row of projectCredits !== null && projectCredits !== void 0 ? projectCredits : []) {
            const credit = Array.isArray(row.credit) ? row.credit[0] : row.credit;
            if (!credit)
                continue;
            const existing = (_e = creditsByProject.get(row.project_id)) !== null && _e !== void 0 ? _e : [];
            existing.push({
                id: credit.id,
                project_credit_id: row.id,
                status: String((_f = row.status) !== null && _f !== void 0 ? _f : "NOT_STARTED"),
                credit_code: credit.credit_code,
                credit_name: credit.credit_name,
                what_to_submit: String((_g = credit.what_to_submit) !== null && _g !== void 0 ? _g : "").trim(),
                requirements: normalizeDocumentsRequired(credit.documents_required)
                    .filter((doc) => doc.type)
                    .map((doc) => ({
                    type: doc.type,
                    label: doc.label || doc.type,
                    required: Boolean(doc.required),
                })),
                doc_types: Array.from(new Set(normalizeDocumentsRequired(credit.documents_required)
                    .filter((doc) => doc.type)
                    .map((doc) => doc.type))),
                prior_examples_by_type: Array.from(new Set(normalizeDocumentsRequired(credit.documents_required)
                    .filter((doc) => doc.type)
                    .map((doc) => doc.type))).reduce((acc, docType) => {
                    var _a;
                    acc[docType] = (_a = priorFilesByCreditAndType.get(`${credit.id}::${docType}`)) !== null && _a !== void 0 ? _a : [];
                    return acc;
                }, {}),
            });
            creditsByProject.set(row.project_id, existing);
        }
        return uploadableProjects.map((project) => {
            var _a;
            return ({
                id: project.id,
                name: project.name,
                credits: (_a = creditsByProject.get(project.id)) !== null && _a !== void 0 ? _a : [],
            });
        });
    });
}
function filterDocuments(documents, filters) {
    var _a;
    const search = (_a = filters.search) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
    return documents.filter((document) => {
        var _a;
        const projectOk = filters.project ? document.project_id === filters.project : true;
        const statusOk = filters.status
            ? document.status === filters.status || String((_a = document.state) !== null && _a !== void 0 ? _a : "").toLowerCase() === filters.status.toLowerCase()
            : true;
        const searchOk = search
            ? [
                document.file_name,
                document.project_name,
                document.credit_code,
                document.credit_name,
                document.doc_category,
                document.notes,
                document.uploaded_by_name,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(search))
            : true;
        return projectOk && statusOk && searchOk;
    });
}
function getTeamMembers() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!env_1.env.isConfigured) {
            return [];
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return [];
        }
        const currentUser = yield (0, exports.getCurrentUser)();
        if (((currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === "super_user" || (currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === "L5") && env_1.env.supabaseServiceRoleKey) {
            const admin = (0, admin_1.createAdminClient)();
            const { data: profiles } = yield admin
                .from("profiles")
                .select("user_id, email, full_name, company, global_role, disabled_at, disabled_reason, created_at")
                .order("created_at", { ascending: false });
            const { data: memberships } = yield admin
                .from("project_users")
                .select("id, project_id, user_id, role, created_at, projects(name)");
            const { data: wallets } = yield admin
                .from("client_accounts")
                .select("primary_client_user_id, token_balance");
            const walletByClient = new Map((wallets !== null && wallets !== void 0 ? wallets : []).map((wallet) => { var _a; return [wallet.primary_client_user_id, Number((_a = wallet.token_balance) !== null && _a !== void 0 ? _a : 0)]; }));
            const grouped = new Map();
            (profiles !== null && profiles !== void 0 ? profiles : []).forEach((profile) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                grouped.set(profile.user_id, {
                    id: profile.user_id, // We use user_id as stable id for list rendering since not everyone has project_user id
                    user_id: profile.user_id,
                    email: (_a = profile.email) !== null && _a !== void 0 ? _a : profile.user_id,
                    full_name: (_b = profile.full_name) !== null && _b !== void 0 ? _b : "Project member",
                    company: (_c = profile.company) !== null && _c !== void 0 ? _c : null,
                    role: normalizeRole((_d = profile.global_role) !== null && _d !== void 0 ? _d : "consultant"),
                    project_names: [],
                    project_ids: [],
                    created_at: (_e = profile.created_at) !== null && _e !== void 0 ? _e : new Date().toISOString(),
                    token_balance: normalizeRole(profile.global_role) === "client"
                        ? (_f = walletByClient.get(profile.user_id)) !== null && _f !== void 0 ? _f : 0
                        : undefined,
                    disabled_at: (_g = profile.disabled_at) !== null && _g !== void 0 ? _g : null,
                    disabled_reason: (_h = profile.disabled_reason) !== null && _h !== void 0 ? _h : null,
                });
            });
            (memberships !== null && memberships !== void 0 ? memberships : []).forEach((row) => {
                const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
                const existing = grouped.get(row.user_id);
                if (existing) {
                    if ((project === null || project === void 0 ? void 0 : project.name) && !existing.project_names.includes(project.name)) {
                        existing.project_names.push(project.name);
                    }
                    if (row.project_id) {
                        if (!existing.project_ids) {
                            existing.project_ids = [];
                        }
                        if (!existing.project_ids.includes(row.project_id)) {
                            existing.project_ids.push(row.project_id);
                        }
                    }
                }
            });
            return Array.from(grouped.values());
        }
        const { data: userMemberships } = yield client
            .from("project_users")
            .select("project_id")
            .eq("user_id", user.id);
        const accessibleProjectIds = Array.from(new Set((userMemberships !== null && userMemberships !== void 0 ? userMemberships : []).map((m) => m.project_id).filter(Boolean)));
        if (accessibleProjectIds.length === 0) {
            return [];
        }
        const { data: memberships } = yield client
            .from("project_users")
            .select("id, project_id, user_id, role, created_at, projects(name)")
            .in("project_id", accessibleProjectIds)
            .order("created_at", { ascending: false });
        const rows = memberships !== null && memberships !== void 0 ? memberships : [];
        const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
        const { data: profiles } = userIds.length
            ? yield client.from("profiles").select("user_id, email, full_name, company, global_role, disabled_at, disabled_reason").in("user_id", userIds)
            : { data: [] };
        const profilesByUser = new Map((profiles !== null && profiles !== void 0 ? profiles : []).map((profile) => [profile.user_id, profile]));
        const { data: wallets } = yield client
            .from("client_accounts")
            .select("primary_client_user_id, token_balance");
        const walletByClient = new Map((wallets !== null && wallets !== void 0 ? wallets : []).map((wallet) => { var _a; return [wallet.primary_client_user_id, Number((_a = wallet.token_balance) !== null && _a !== void 0 ? _a : 0)]; }));
        const grouped = new Map();
        rows.forEach((row) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const profile = profilesByUser.get(row.user_id);
            const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
            const existing = grouped.get(row.user_id);
            if (existing) {
                if ((project === null || project === void 0 ? void 0 : project.name) && !existing.project_names.includes(project.name)) {
                    existing.project_names.push(project.name);
                }
                if (row.project_id && !((_a = existing.project_ids) === null || _a === void 0 ? void 0 : _a.includes(row.project_id))) {
                    existing.project_ids = [...((_b = existing.project_ids) !== null && _b !== void 0 ? _b : []), row.project_id];
                }
                return;
            }
            grouped.set(row.user_id, {
                id: row.id,
                user_id: row.user_id,
                email: (_c = profile === null || profile === void 0 ? void 0 : profile.email) !== null && _c !== void 0 ? _c : row.user_id,
                full_name: (_d = profile === null || profile === void 0 ? void 0 : profile.full_name) !== null && _d !== void 0 ? _d : "Project member",
                company: (_e = profile === null || profile === void 0 ? void 0 : profile.company) !== null && _e !== void 0 ? _e : null,
                role: normalizeRole((_f = profile === null || profile === void 0 ? void 0 : profile.global_role) !== null && _f !== void 0 ? _f : row.role),
                project_names: (project === null || project === void 0 ? void 0 : project.name) ? [project.name] : [],
                project_ids: row.project_id ? [row.project_id] : [],
                created_at: row.created_at,
                token_balance: normalizeRole((_g = profile === null || profile === void 0 ? void 0 : profile.global_role) !== null && _g !== void 0 ? _g : row.role) === "client"
                    ? (_h = walletByClient.get(row.user_id)) !== null && _h !== void 0 ? _h : 0
                    : undefined,
                disabled_at: (_j = profile === null || profile === void 0 ? void 0 : profile.disabled_at) !== null && _j !== void 0 ? _j : null,
                disabled_reason: (_k = profile === null || profile === void 0 ? void 0 : profile.disabled_reason) !== null && _k !== void 0 ? _k : null,
            });
        });
        return Array.from(grouped.values());
    });
}
exports.getOwnerReviewQueue = cache(function getOwnerReviewQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        if (!env_1.env.isConfigured) {
            return [];
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return [];
        }
        const currentUser = yield (0, exports.getCurrentUser)();
        const userRole = (_a = currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) !== null && _a !== void 0 ? _a : "consultant";
        const isL1 = userRole === "owner" || userRole === "L1";
        const reviewWorkflowStates = isL1
            ? ["L1_REVIEW"]
            : ["UNDER_L3_REVIEW"];
        const isL5 = userRole === "super_user" || userRole === "L5";
        const projectRoleRows = isL5
            ? []
            : (_b = (yield client
                .from("project_users")
                .select("project_id, role")
                .eq("user_id", user.id)).data) !== null && _b !== void 0 ? _b : [];
        const reviewerProjectRoles = ["owner", "L1", "project_admin", "L3", "super_admin", "L5", "super_user"];
        const ownedProjectIds = isL5
            ? (_d = (_c = (yield client.from("projects").select("id")).data) === null || _c === void 0 ? void 0 : _c.map((row) => row.id)) !== null && _d !== void 0 ? _d : []
            : projectRoleRows
                .filter((row) => reviewerProjectRoles.includes(row.role) || reviewerProjectRoles.includes(normalizeRole(row.role)))
                .map((row) => row.project_id);
        if (!ownedProjectIds.length) {
            return [];
        }
        const { data: docs } = yield client
            .from("project_document")
            .select("id, project_id, credit_id, submittal_id, uploaded_by, file_name, uploaded_at, notes, state")
            .in("project_id", ownedProjectIds)
            .in("state", reviewWorkflowStates)
            .neq("uploaded_by", user.id) // Never review your own uploads
            .order("uploaded_at", { ascending: true });
        const rows = docs !== null && docs !== void 0 ? docs : [];
        if (!rows.length) {
            return [];
        }
        const projectIds = Array.from(new Set(rows.map((row) => row.project_id)));
        const creditIds = Array.from(new Set(rows.map((row) => row.credit_id).filter(Boolean)));
        const userIds = Array.from(new Set(rows.map((row) => row.uploaded_by).filter(Boolean)));
        const [{ data: projects }, { data: credits }, { data: profiles }] = yield Promise.all([
            client.from("projects").select("id, name").in("id", projectIds),
            creditIds.length ? client.from("project_credits").select("id, credit_name, category, is_mandatory").in("id", creditIds) : Promise.resolve({ data: [] }),
            userIds.length ? client.from("profiles").select("user_id, full_name, email").in("user_id", userIds) : Promise.resolve({ data: [] }),
        ]);
        const projectById = new Map((projects !== null && projects !== void 0 ? projects : []).map((row) => [row.id, row.name]));
        const creditById = new Map((credits !== null && credits !== void 0 ? credits : []).map((row) => [row.id, row]));
        const userById = new Map((profiles !== null && profiles !== void 0 ? profiles : []).map((row) => { var _a, _b; return [row.user_id, (_b = (_a = row.full_name) !== null && _a !== void 0 ? _a : row.email) !== null && _b !== void 0 ? _b : "Team member"]; }));
        return rows
            .map((row) => {
            var _a, _b, _c, _d, _e, _f;
            const credit = row.credit_id ? creditById.get(row.credit_id) : null;
            const workflow = (0, state_renderer_1.workflowStateRenderer)(row.state);
            return {
                id: row.id,
                project_id: row.project_id,
                submittal_id: (_a = row.submittal_id) !== null && _a !== void 0 ? _a : null,
                project_name: (_b = projectById.get(row.project_id)) !== null && _b !== void 0 ? _b : "Project",
                credit_name: (_c = credit === null || credit === void 0 ? void 0 : credit.credit_name) !== null && _c !== void 0 ? _c : "Credit",
                credit_category: (_d = credit === null || credit === void 0 ? void 0 : credit.category) !== null && _d !== void 0 ? _d : null,
                is_mandatory: Boolean(credit === null || credit === void 0 ? void 0 : credit.is_mandatory),
                uploaded_by_name: row.uploaded_by ? (_e = userById.get(row.uploaded_by)) !== null && _e !== void 0 ? _e : "Team member" : "Team member",
                file_name: row.file_name,
                uploaded_at: row.uploaded_at,
                notes: (_f = row.notes) !== null && _f !== void 0 ? _f : "",
                workflow_state: workflow.state,
                allowed_actions: workflow.allowedActions,
                lock_state: {
                    locked: workflow.locked,
                    reason: workflow.blocker,
                },
            };
        })
            .sort((a, b) => {
            var _a, _b;
            const projectCompare = String(a.project_name).localeCompare(String(b.project_name));
            if (projectCompare !== 0)
                return projectCompare;
            if (a.workflow_state === "CLARIFICATION" && b.workflow_state !== "CLARIFICATION")
                return -1;
            if (a.workflow_state !== "CLARIFICATION" && b.workflow_state === "CLARIFICATION")
                return 1;
            if (a.is_mandatory !== b.is_mandatory)
                return a.is_mandatory ? -1 : 1;
            const categoryCompare = String((_a = a.credit_category) !== null && _a !== void 0 ? _a : "").localeCompare(String((_b = b.credit_category) !== null && _b !== void 0 ? _b : ""));
            if (categoryCompare !== 0)
                return categoryCompare;
            return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
        });
    });
});
function getReviewerPerformanceSummary() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!env_1.env.isConfigured) {
            return {
                reviewedToday: 0,
                approvedToday: 0,
                rejectedToday: 0,
                approvalRateToday: 0,
            };
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return {
                reviewedToday: 0,
                approvedToday: 0,
                rejectedToday: 0,
                approvalRateToday: 0,
            };
        }
        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const { data: logs } = yield client
            .from("document_activity_logs")
            .select("details")
            .eq("actor_id", user.id)
            .eq("action", "status_updated")
            .gte("created_at", dayStart);
        let approvedToday = 0;
        let rejectedToday = 0;
        for (const row of logs !== null && logs !== void 0 ? logs : []) {
            const details = (_a = row.details) !== null && _a !== void 0 ? _a : {};
            const toState = String((_b = details.to_state) !== null && _b !== void 0 ? _b : "");
            if (toState === "APPROVED" || toState === "UNDER_REVIEW") {
                approvedToday += 1;
            }
            if (toState === "REJECTED" || toState === "CLARIFICATION") {
                rejectedToday += 1;
            }
        }
        const reviewedToday = approvedToday + rejectedToday;
        const approvalRateToday = reviewedToday ? Math.round((approvedToday / reviewedToday) * 100) : 0;
        return {
            reviewedToday,
            approvedToday,
            rejectedToday,
            approvalRateToday,
        };
    });
}
exports.getExecutiveInsights = cache(function getExecutiveInsights() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const projects = yield (0, exports.getDashboardProjects)();
        if (!projects.length) {
            return {
                stuckItems: [],
                rejectionPatterns: [],
                vendorStats: [],
                projectComparisons: [],
            };
        }
        const client = (0, server_1.createClient)();
        const projectIds = projects.map((project) => project.id);
        const [{ data: credits }, { data: documents }, { data: profiles }] = yield Promise.all([
            client
                .from("project_credits")
                .select("id, project_id, credit_code, credit_name, responsible_role, documents_required, created_at")
                .in("project_id", projectIds),
            client
                .from("project_document")
                .select("id, project_id, credit_id, uploaded_by, state, rejection_reason")
                .in("project_id", projectIds),
            client.from("profiles").select("user_id, full_name, email"),
        ]);
        const docsByCredit = new Map();
        for (const document of documents !== null && documents !== void 0 ? documents : []) {
            const existing = (_a = docsByCredit.get(document.credit_id)) !== null && _a !== void 0 ? _a : [];
            existing.push(document);
            docsByCredit.set(document.credit_id, existing);
        }
        const projectById = new Map(projects.map((project) => [project.id, project]));
        const uploaderById = new Map((profiles !== null && profiles !== void 0 ? profiles : []).map((profile) => { var _a, _b; return [profile.user_id, (_b = (_a = profile.full_name) !== null && _a !== void 0 ? _a : profile.email) !== null && _b !== void 0 ? _b : "Team member"]; }));
        const stuckItems = (credits !== null && credits !== void 0 ? credits : [])
            .map((credit) => {
            var _a, _b, _c, _d, _e;
            const creditDocuments = (_a = docsByCredit.get(credit.id)) !== null && _a !== void 0 ? _a : [];
            const requiredDocs = normalizeDocumentsRequired(credit.documents_required).filter((item) => Boolean(item === null || item === void 0 ? void 0 : item.required));
            const missing = requiredDocs.find((item) => !creditDocuments.some((doc) => doc.doc_category === item.type));
            const rejectedCount = creditDocuments.filter((doc) => {
                const state = normalizeWorkflowState(doc.state, doc.status);
                return state === "REJECTED" || state === "CLARIFICATION";
            }).length;
            const pendingCount = creditDocuments.filter((doc) => {
                const state = normalizeWorkflowState(doc.state, doc.status);
                return state === "SUBMITTED" || state === "UNDER_REVIEW" || state === "RESUBMITTED";
            }).length;
            const stalledDays = credit.created_at ? Math.max(0, Math.floor((Date.now() - new Date(credit.created_at).getTime()) / (1000 * 60 * 60 * 24))) : 0;
            return {
                projectId: credit.project_id,
                projectName: (_c = (_b = projectById.get(credit.project_id)) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : "Project",
                creditId: credit.id,
                creditCode: credit.credit_code,
                creditName: credit.credit_name,
                responsibleRole: (_d = credit.responsible_role) !== null && _d !== void 0 ? _d : "consultant",
                missingDoc: (_e = missing === null || missing === void 0 ? void 0 : missing.label) !== null && _e !== void 0 ? _e : "No mandatory evidence uploaded",
                rejectedCount,
                pendingCount,
                stalledDays,
            };
        })
            .filter((item) => item.missingDoc || item.rejectedCount > 0 || item.pendingCount > 0)
            .sort((a, b) => b.rejectedCount + b.pendingCount - (a.rejectedCount + a.pendingCount))
            .slice(0, 15);
        const rejectionPatternsMap = new Map();
        for (const document of documents !== null && documents !== void 0 ? documents : []) {
            const state = normalizeWorkflowState(document.state, document.status);
            if (!(state === "REJECTED" || state === "CLARIFICATION"))
                continue;
            const reason = String((_b = document.rejection_reason) !== null && _b !== void 0 ? _b : "Unspecified").trim();
            const bucket = reason ? reason.split(".")[0].slice(0, 90) : "Unspecified";
            rejectionPatternsMap.set(bucket, ((_c = rejectionPatternsMap.get(bucket)) !== null && _c !== void 0 ? _c : 0) + 1);
        }
        const rejectionPatterns = Array.from(rejectionPatternsMap.entries())
            .map(([key, count]) => ({ key, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
        const uploaderAgg = new Map();
        for (const document of documents !== null && documents !== void 0 ? documents : []) {
            if (!document.uploaded_by)
                continue;
            const existing = (_d = uploaderAgg.get(document.uploaded_by)) !== null && _d !== void 0 ? _d : {
                name: (_e = uploaderById.get(document.uploaded_by)) !== null && _e !== void 0 ? _e : "Team member",
                projects: new Set(),
                approved: 0,
                rejected: 0,
            };
            existing.projects.add(document.project_id);
            const state = normalizeWorkflowState(document.state, document.status);
            if (state === "APPROVED")
                existing.approved += 1;
            if (state === "REJECTED" || state === "CLARIFICATION")
                existing.rejected += 1;
            uploaderAgg.set(document.uploaded_by, existing);
        }
        const vendorStats = Array.from(uploaderAgg.values())
            .map((entry) => {
            const totalReviewed = entry.approved + entry.rejected;
            return {
                uploader: entry.name,
                projectCount: entry.projects.size,
                approved: entry.approved,
                rejected: entry.rejected,
                approvalRate: totalReviewed ? Math.round((entry.approved / totalReviewed) * 100) : 0,
            };
        })
            .sort((a, b) => b.rejected - a.rejected)
            .slice(0, 10);
        const projectComparisons = projects.map((project) => {
            var _a, _b;
            const pending = Number((_a = project.pendingReviewsCount) !== null && _a !== void 0 ? _a : 0);
            const rejected = Number((_b = project.rejectedCount) !== null && _b !== void 0 ? _b : 0);
            const reviewedBase = Math.max(pending + rejected, 1);
            const efficiency = Math.max(0, Math.round(((reviewedBase - rejected) / reviewedBase) * 100));
            return {
                projectId: project.id,
                projectName: project.name,
                completion: Math.round(project.overallCompletion),
                pending,
                rejected,
                efficiency,
            };
        });
        return {
            stuckItems,
            rejectionPatterns,
            vendorStats,
            projectComparisons,
        };
    });
});
function getAuditTimeline() {
    return __awaiter(this, arguments, void 0, function* (filters = {}) {
        var _a, _b;
        if (!env_1.env.isConfigured) {
            return [];
        }
        const client = (0, server_1.createClient)();
        const user = yield getSupabaseUser(client);
        if (!user) {
            return [];
        }
        const projects = yield (0, exports.getDashboardProjects)();
        const visibleProjectIds = projects.map((project) => project.id);
        if (!visibleProjectIds.length) {
            return [];
        }
        let query = client
            .from("system_activity_logs")
            .select("id, project_id, entity_type, action, actor_id, actor_role, summary, created_at")
            .in("project_id", visibleProjectIds)
            .order("created_at", { ascending: false })
            .limit(Math.min(Math.max((_a = filters.limit) !== null && _a !== void 0 ? _a : 60, 10), 200));
        if (filters.projectId) {
            query = query.eq("project_id", filters.projectId);
        }
        if (filters.action) {
            query = query.eq("action", filters.action);
        }
        if (filters.entityType) {
            query = query.eq("entity_type", filters.entityType);
        }
        if (filters.actorRole) {
            query = query.eq("actor_role", filters.actorRole);
        }
        const { data: logs } = yield query;
        const rows = logs !== null && logs !== void 0 ? logs : [];
        if (!rows.length) {
            return [];
        }
        const actorIds = Array.from(new Set(rows.map((row) => row.actor_id).filter(Boolean)));
        const [profilesResult] = yield Promise.all([
            actorIds.length
                ? client.from("profiles").select("user_id, full_name, email").in("user_id", actorIds)
                : Promise.resolve({ data: [] }),
        ]);
        const actorById = new Map(((_b = profilesResult.data) !== null && _b !== void 0 ? _b : []).map((profile) => {
            var _a, _b;
            return [
                profile.user_id,
                (_b = (_a = profile.full_name) !== null && _a !== void 0 ? _a : profile.email) !== null && _b !== void 0 ? _b : "Team member",
            ];
        }));
        const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
        return rows.map((row) => {
            var _a, _b, _c, _d, _e;
            return ({
                id: row.id,
                project_id: (_a = row.project_id) !== null && _a !== void 0 ? _a : null,
                project_name: row.project_id ? (_b = projectNameById.get(row.project_id)) !== null && _b !== void 0 ? _b : "Project" : "Project",
                entity_type: row.entity_type,
                action: row.action,
                summary: row.summary,
                actor_id: (_c = row.actor_id) !== null && _c !== void 0 ? _c : null,
                actor_role: (_d = row.actor_role) !== null && _d !== void 0 ? _d : null,
                actor_name: row.actor_id ? (_e = actorById.get(row.actor_id)) !== null && _e !== void 0 ? _e : null : null,
                created_at: row.created_at,
            });
        });
    });
}
function getMyRoleTasks() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!env_1.env.isConfigured) {
            return { role: "consultant", summary: { total: 0, complete: 0, pending: 0 }, tasks: [] };
        }
        const currentUser = yield (0, exports.getCurrentUser)();
        if (!currentUser) {
            return { role: "consultant", summary: { total: 0, complete: 0, pending: 0 }, tasks: [] };
        }
        const scopedRoles = ["architect", "mep", "contractor"];
        if (!scopedRoles.includes(currentUser.role)) {
            return { role: currentUser.role, summary: { total: 0, complete: 0, pending: 0 }, tasks: [] };
        }
        const projects = yield (0, exports.getDashboardProjects)();
        const projectIds = projects.map((project) => project.id);
        if (!projectIds.length) {
            return { role: currentUser.role, summary: { total: 0, complete: 0, pending: 0 }, tasks: [] };
        }
        const client = (0, server_1.createClient)();
        const [{ data: credits }, { data: documents }, { data: projectRows }] = yield Promise.all([
            client
                .from("project_credits")
                .select("id, project_id, credit_code, credit_name, responsible_role, documents_required")
                .in("project_id", projectIds)
                .eq("responsible_role", currentUser.role),
            client
                .from("project_document")
                .select("id, credit_id, state, uploaded_at")
                .in("project_id", projectIds),
            client.from("projects").select("id, name").in("id", projectIds),
        ]);
        const projectById = new Map((projectRows !== null && projectRows !== void 0 ? projectRows : []).map((project) => [project.id, project.name]));
        const docsByCredit = new Map();
        for (const document of documents !== null && documents !== void 0 ? documents : []) {
            const existing = (_a = docsByCredit.get(document.credit_id)) !== null && _a !== void 0 ? _a : [];
            existing.push(document);
            docsByCredit.set(document.credit_id, existing);
        }
        const tasks = (credits !== null && credits !== void 0 ? credits : []).map((credit) => {
            var _a, _b;
            const creditDocs = (_a = docsByCredit.get(credit.id)) !== null && _a !== void 0 ? _a : [];
            const derived = deriveCreditLifecycleState(credit, creditDocs);
            const requiredDocCount = normalizeDocumentsRequired(credit.documents_required).filter((doc) => doc.required).length;
            const approvedCount = creditDocs.filter((document) => normalizeWorkflowState(document.state, document.status) === "APPROVED").length;
            return {
                id: credit.id,
                project_id: credit.project_id,
                project_name: (_b = projectById.get(credit.project_id)) !== null && _b !== void 0 ? _b : "Project",
                credit_name: credit.credit_name,
                status: derived.status,
                completion_pct: derived.completion_pct,
                required_count: requiredDocCount,
                approved_count: approvedCount,
            };
        });
        const complete = tasks.filter((task) => task.status === "complete").length;
        return {
            role: currentUser.role,
            summary: {
                total: tasks.length,
                complete,
                pending: Math.max(tasks.length - complete, 0),
            },
            tasks,
        };
    });
}
function getSuperUserCommandCenter() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const currentUser = yield (0, exports.getCurrentUser)();
        if ((currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) !== "super_user") {
            return null;
        }
        if (!env_1.env.isConfigured || !env_1.env.supabaseServiceRoleKey) {
            return null;
        }
        const admin = (0, admin_1.createAdminClient)();
        const [{ data: projects }, { data: wallets }, { data: transactions }, { data: uploadLogs }, { data: profiles }] = yield Promise.all([
            admin.from("projects").select("id, name, client, status, created_at"),
            admin.from("client_accounts").select("id, primary_client_user_id, account_name, token_balance"),
            admin
                .from("token_transactions")
                .select("id, client_account_id, project_id, transaction_kind, tokens, reason, created_at, meta")
                .order("created_at", { ascending: false })
                .limit(1000),
            admin
                .from("document_activity_logs")
                .select("id, action, created_at")
                .eq("action", "uploaded")
                .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
            admin.from("profiles").select("user_id, full_name, email, company, global_role"),
        ]);
        const profileById = new Map((profiles !== null && profiles !== void 0 ? profiles : []).map((row) => [row.user_id, row]));
        const projectsByClient = new Map();
        for (const project of projects !== null && projects !== void 0 ? projects : []) {
            const key = (project.client || "Unassigned Client").trim();
            const existing = (_a = projectsByClient.get(key)) !== null && _a !== void 0 ? _a : [];
            existing.push(project);
            projectsByClient.set(key, existing);
        }
        const transactionsByClient = new Map();
        for (const tx of transactions !== null && transactions !== void 0 ? transactions : []) {
            const wallet = (wallets !== null && wallets !== void 0 ? wallets : []).find((row) => row.id === tx.client_account_id);
            const profile = (wallet === null || wallet === void 0 ? void 0 : wallet.primary_client_user_id) ? profileById.get(wallet.primary_client_user_id) : null;
            const clientKey = ((wallet === null || wallet === void 0 ? void 0 : wallet.account_name) || (profile === null || profile === void 0 ? void 0 : profile.company) || "Unassigned Client").trim();
            const existing = (_b = transactionsByClient.get(clientKey)) !== null && _b !== void 0 ? _b : [];
            existing.push(tx);
            transactionsByClient.set(clientKey, existing);
        }
        const clientWalletRows = (wallets !== null && wallets !== void 0 ? wallets : []).map((wallet) => {
            var _a;
            const profile = wallet.primary_client_user_id ? profileById.get(wallet.primary_client_user_id) : null;
            return {
                client_user_id: wallet.primary_client_user_id,
                client_account_id: wallet.id,
                client_name: wallet.account_name || (profile === null || profile === void 0 ? void 0 : profile.company) || "Unassigned Client",
                client_contact: (profile === null || profile === void 0 ? void 0 : profile.full_name) || (profile === null || profile === void 0 ? void 0 : profile.email) || "Client contact",
                balance: Number((_a = wallet.token_balance) !== null && _a !== void 0 ? _a : 0),
            };
        });
        const clientRows = Array.from(projectsByClient.entries()).map(([clientName, rows]) => {
            var _a, _b;
            const matchingWallet = clientWalletRows.find((wallet) => wallet.client_name === clientName);
            const clientTx = (_a = transactionsByClient.get(clientName)) !== null && _a !== void 0 ? _a : [];
            const consumed = clientTx
                .filter((tx) => tx.transaction_kind === "debit")
                .reduce((sum, tx) => { var _a; return sum + Number((_a = tx.tokens) !== null && _a !== void 0 ? _a : 0); }, 0);
            const credited = clientTx
                .filter((tx) => tx.transaction_kind !== "debit")
                .reduce((sum, tx) => { var _a; return sum + Number((_a = tx.tokens) !== null && _a !== void 0 ? _a : 0); }, 0);
            const walletBalance = (_b = matchingWallet === null || matchingWallet === void 0 ? void 0 : matchingWallet.balance) !== null && _b !== void 0 ? _b : 0;
            const projectCount = rows.length;
            const status = walletBalance <= 20 ? "Needs Top-Up" : rows.some((project) => project.status === "active") ? "Active" : "Monitoring";
            return {
                client_name: clientName,
                wallet_balance: walletBalance,
                project_count: projectCount,
                status,
                tokens_credited: credited,
                tokens_consumed: consumed,
            };
        });
        const totalTokensSold = (transactions !== null && transactions !== void 0 ? transactions : [])
            .filter((tx) => tx.transaction_kind !== "debit")
            .reduce((sum, tx) => { var _a; return sum + Number((_a = tx.tokens) !== null && _a !== void 0 ? _a : 0); }, 0);
        const totalTokensConsumed = (transactions !== null && transactions !== void 0 ? transactions : [])
            .filter((tx) => tx.transaction_kind === "debit")
            .reduce((sum, tx) => { var _a; return sum + Number((_a = tx.tokens) !== null && _a !== void 0 ? _a : 0); }, 0);
        const weeklyConsumed = (transactions !== null && transactions !== void 0 ? transactions : [])
            .filter((tx) => tx.transaction_kind === "debit" && new Date(tx.created_at).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000)
            .reduce((sum, tx) => { var _a; return sum + Number((_a = tx.tokens) !== null && _a !== void 0 ? _a : 0); }, 0);
        const uploadSpend = (transactions !== null && transactions !== void 0 ? transactions : [])
            .filter((tx) => { var _a; return String((_a = tx.reason) !== null && _a !== void 0 ? _a : "").toLowerCase().includes("upload") && tx.transaction_kind === "debit"; })
            .reduce((sum, tx) => { var _a; return sum + Number((_a = tx.tokens) !== null && _a !== void 0 ? _a : 0); }, 0);
        const consultSpend = (transactions !== null && transactions !== void 0 ? transactions : [])
            .filter((tx) => { var _a; return String((_a = tx.reason) !== null && _a !== void 0 ? _a : "").toLowerCase().includes("consult") && tx.transaction_kind === "debit"; })
            .reduce((sum, tx) => { var _a; return sum + Number((_a = tx.tokens) !== null && _a !== void 0 ? _a : 0); }, 0);
        const refunds = (transactions !== null && transactions !== void 0 ? transactions : [])
            .filter((tx) => { var _a; return tx.transaction_kind === "refund" || String((_a = tx.reason) !== null && _a !== void 0 ? _a : "").toLowerCase().includes("refund"); })
            .reduce((sum, tx) => { var _a; return sum + Number((_a = tx.tokens) !== null && _a !== void 0 ? _a : 0); }, 0);
        const uploadsToday = (uploadLogs !== null && uploadLogs !== void 0 ? uploadLogs : []).length;
        const failedTransactions = (transactions !== null && transactions !== void 0 ? transactions : []).filter((tx) => { var _a; return String((_a = tx.reason) !== null && _a !== void 0 ? _a : "").toLowerCase().includes("failed"); }).length;
        const pendingReviews = (_c = (yield admin.from("project_document").select("*", { count: "exact", head: true }).in("state", ["L1_REVIEW", "UNDER_L3_REVIEW", "RESUBMITTED"])).count) !== null && _c !== void 0 ? _c : 0;
        const activeUsers = (_d = (yield admin.from("project_users").select("user_id")).data) === null || _d === void 0 ? void 0 : _d.map((row) => row.user_id).filter(Boolean);
        const uniqueActiveUsers = Array.from(new Set(activeUsers !== null && activeUsers !== void 0 ? activeUsers : [])).length;
        const criticalAlerts = [];
        for (const row of clientRows) {
            if (row.wallet_balance <= 20) {
                criticalAlerts.push(`${row.client_name} token balance critical (${row.wallet_balance} remaining)`);
            }
        }
        if (failedTransactions > 0) {
            criticalAlerts.push(`Transaction anomalies detected (${failedTransactions} flagged records)`);
        }
        if (pendingReviews > 120) {
            criticalAlerts.push(`Validation queue spike detected (${pendingReviews} pending reviews)`);
        }
        const revenueEstimateInr = totalTokensSold * 1;
        const reconciliationRows = clientWalletRows.map((wallet) => {
            const tx = (transactions !== null && transactions !== void 0 ? transactions : []).filter((row) => row.client_account_id === wallet.client_account_id);
            const ledgerDelta = tx.reduce((sum, row) => {
                var _a;
                const direction = row.transaction_kind === "debit" ? -1 : 1;
                return sum + direction * Number((_a = row.tokens) !== null && _a !== void 0 ? _a : 0);
            }, 0);
            const baselineEstimate = wallet.balance - ledgerDelta;
            const mismatch = Math.abs((baselineEstimate + ledgerDelta) - wallet.balance);
            return {
                client_user_id: wallet.client_user_id,
                client_name: wallet.client_name,
                wallet_balance: wallet.balance,
                ledger_delta: ledgerDelta,
                baseline_estimate: baselineEstimate,
                mismatch,
                status: mismatch > 0 ? "investigate" : "ok",
            };
        });
        const anomalyCount = reconciliationRows.filter((row) => row.status === "investigate").length;
        if (anomalyCount > 0) {
            criticalAlerts.push(`Ledger reconciliation needs review for ${anomalyCount} client wallet(s).`);
        }
        return {
            clients: clientRows.sort((a, b) => a.client_name.localeCompare(b.client_name)),
            wallets: clientWalletRows.sort((a, b) => a.client_name.localeCompare(b.client_name)),
            tokenEconomy: {
                totalTokensSold,
                totalTokensConsumed,
                weeklyConsumed,
                uploadSpend,
                consultSpend,
                refunds,
                revenueEstimateInr,
            },
            health: {
                uploadsToday,
                failedTransactions,
                pendingReviews,
                activeUsers: uniqueActiveUsers,
            },
            alerts: criticalAlerts,
            recentTransactions: (transactions !== null && transactions !== void 0 ? transactions : []).slice(0, 20).map((tx) => {
                var _a, _b, _c, _d, _e;
                return ({
                    id: tx.id,
                    client_user_id: (_b = (_a = clientWalletRows.find((wallet) => wallet.client_account_id === tx.client_account_id)) === null || _a === void 0 ? void 0 : _a.client_user_id) !== null && _b !== void 0 ? _b : null,
                    project_id: tx.project_id,
                    tokens: tx.transaction_kind === "debit" ? -Number((_c = tx.tokens) !== null && _c !== void 0 ? _c : 0) : Number((_d = tx.tokens) !== null && _d !== void 0 ? _d : 0),
                    reason: String((_e = tx.reason) !== null && _e !== void 0 ? _e : ""),
                    created_at: tx.created_at,
                });
            }),
            reconciliation: reconciliationRows,
        };
    });
}
exports.getRoleTasks = cache(function getRoleTasks() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const user = yield (0, exports.getCurrentUser)();
        if (!user)
            return [];
        const client = (0, server_1.createClient)();
        const projects = yield (0, exports.getDashboardProjects)();
        const tasks = [];
        for (const project of projects) {
            const role = project.role;
            const workspace = yield (0, exports.getProjectWorkspace)(project.id);
            if (workspace) {
                const myCredits = workspace.credits.filter((credit) => {
                    var _a, _b;
                    const status = String((_a = credit.status) !== null && _a !== void 0 ? _a : "").toLowerCase();
                    if (status === "complete" || status === "closed" || status === "approved")
                        return false;
                    const assignedUserId = String((_b = credit.assigned_user_id) !== null && _b !== void 0 ? _b : "").trim();
                    if (assignedUserId) {
                        return assignedUserId === user.id;
                    }
                    const requirements = normalizeDocumentsRequired(credit.documents_required);
                    const hasAssignedDoc = requirements.some((r) => r.assigned_user_id === user.id);
                    if (hasAssignedDoc)
                        return true;
                    if (['architect', 'mep', 'contractor', 'consultant'].includes(role)) {
                        return credit.responsible_role === role;
                    }
                    return false;
                });
                for (const credit of myCredits) {
                    const requirements = normalizeDocumentsRequired(credit.documents_required);
                    const missingDocs = requirements.filter((r) => r.required && !credit.documents.some((d) => d.doc_category === r.type && d.status === "approved"));
                    const myMissingDocs = missingDocs.filter(r => {
                        if (r.assigned_user_id)
                            return r.assigned_user_id === user.id;
                        if (credit.assigned_user_id)
                            return credit.assigned_user_id === user.id;
                        if (['architect', 'mep', 'contractor', 'consultant'].includes(role)) {
                            return credit.responsible_role === role;
                        }
                        return false;
                    });
                    if (myMissingDocs.length > 0) {
                        tasks.push({
                            id: 'upload-' + credit.id,
                            type: 'upload_pending',
                            title: 'Upload ' + myMissingDocs.length + ' document(s)',
                            subtitle: credit.credit_code + ': ' + credit.credit_name,
                            projectId: project.id,
                            projectName: project.name,
                            actionUrl: '/projects/' + project.id + '?credit=' + credit.id + '&action=upload',
                            priority: credit.is_mandatory ? 'high' : 'medium',
                        });
                    }
                }
            }
            const { data: clarifications } = yield client
                .from('project_document')
                .select('id, file_name, project_credits(credit_code), notes, state')
                .eq('project_id', project.id)
                .eq('uploaded_by', user.id)
                .eq('state', 'CLARIFICATION')
                .limit(10);
            for (const doc of clarifications !== null && clarifications !== void 0 ? clarifications : []) {
                tasks.push({
                    id: 'clarify-' + doc.id,
                    type: 'clarification_needed',
                    title: 'Clarification required',
                    subtitle: (((_a = doc.credit) === null || _a === void 0 ? void 0 : _a.credit_code) || 'Doc') + ': ' + doc.file_name,
                    projectId: project.id,
                    projectName: project.name,
                    actionUrl: '/documents?project=' + project.id + '&document=' + doc.id,
                    priority: 'high',
                });
            }
            // Redundant 'items to review' rollup has been removed
            // The UI's Review tab natively handles rendering these items individually.
        }
        const { data: materializedTasks } = yield client
            .from("project_tasks")
            .select("id, project_id, project_credit_id, document_id, task_type, title, description, priority, status")
            .eq("assigned_user_id", user.id)
            .in("status", ["open", "in_progress"])
            .order("created_at", { ascending: false })
            .limit(100);
        const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
        for (const item of materializedTasks !== null && materializedTasks !== void 0 ? materializedTasks : []) {
            const projectId = String((_b = item.project_id) !== null && _b !== void 0 ? _b : "");
            if (!projectId)
                continue;
            const projectName = (_c = projectNameById.get(projectId)) !== null && _c !== void 0 ? _c : "Project";
            const taskType = String((_d = item.task_type) !== null && _d !== void 0 ? _d : "");
            if (taskType === "assignment_upload")
                continue;
            const actionUrl = taskType === "clarification_fix"
                ? `/documents?project=${projectId}&document=${(_e = item.document_id) !== null && _e !== void 0 ? _e : ""}`
                : `/projects/${projectId}`;
            tasks.push({
                id: `mat-${item.id}`,
                type: taskType === "clarification_fix" ? "clarification_needed" : "upload_pending",
                title: String((_f = item.title) !== null && _f !== void 0 ? _f : "Pending task"),
                subtitle: String((_g = item.description) !== null && _g !== void 0 ? _g : projectName),
                projectId,
                projectName,
                actionUrl,
                priority: String((_h = item.priority) !== null && _h !== void 0 ? _h : "medium"),
            });
        }
        const unique = new Map();
        for (const task of tasks) {
            const key = `${task.type}:${task.projectId}:${task.title}:${task.subtitle}`;
            if (!unique.has(key))
                unique.set(key, task);
        }
        return Array.from(unique.values()).sort((a, b) => (a.priority === 'high' ? -1 : 1));
    });
});
// Advanced Intelligence & Monetization (M3/M4)
function getBurnRateForecast(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const client = (0, server_1.createClient)();
        const now = new Date();
        const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
        const { data: transactions } = yield client
            .from('token_transactions')
            .select('amount, created_at')
            .eq('project_id', projectId)
            .gte('created_at', fourWeeksAgo.toISOString());
        const totalBurned = (transactions !== null && transactions !== void 0 ? transactions : []).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const weeklyBurn = totalBurned / 4;
        const { data: wallet } = yield client
            .from('wallets')
            .select('balance')
            .eq('project_id', projectId)
            .maybeSingle();
        const balance = (_a = wallet === null || wallet === void 0 ? void 0 : wallet.balance) !== null && _a !== void 0 ? _a : 0;
        const weeksRemaining = weeklyBurn > 0 ? Math.floor(balance / weeklyBurn) : Infinity;
        return {
            weeklyBurn,
            balance,
            weeksRemaining,
            isCritical: weeksRemaining <= 2,
        };
    });
}
function getVendorIntelligence() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = (0, server_1.createClient)();
        const { data: stats } = yield client
            .from('project_document')
            .select('uploaded_by, state, project_id');
        const vendorMap = new Map();
        for (const doc of stats !== null && stats !== void 0 ? stats : []) {
            const vendor = doc.uploaded_by || 'Unknown';
            if (!vendorMap.has(vendor)) {
                vendorMap.set(vendor, { uploads: 0, approvals: 0, rejections: 0, projects: new Set() });
            }
            const v = vendorMap.get(vendor);
            v.uploads++;
            v.projects.add(doc.project_id);
            if (doc.state === 'APPROVED')
                v.approvals++;
            if (doc.state === 'REJECTED' || doc.state === 'CLARIFICATION')
                v.rejections++;
        }
        return Array.from(vendorMap.entries()).map(([vendor, v]) => ({
            vendor,
            uploadCount: v.uploads,
            approvalRate: v.uploads > 0 ? Math.round((v.approvals / v.uploads) * 100) : 0,
            projectCount: v.projects.size,
            efficiencyScore: Math.max(0, 100 - (v.rejections / Math.max(v.uploads, 1)) * 100),
        })).sort((a, b) => b.efficiencyScore - a.efficiencyScore);
    });
}
function getRatingSystems() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!env_1.env.isConfigured)
            return [];
        // Use admin client to bypass RLS on the master library table –
        // rating systems are public reference data that every authenticated user needs to see.
        const client = env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : (0, server_1.createClient)();
        // The table is `rating_systems` on the remote DB (migration 0043 rename to
        // `rating_system` has not been applied remotely yet). Try both names gracefully.
        const { data, error } = yield client
            .from('rating_systems')
            .select('id, name')
            .order('name', { ascending: true });
        if (error) {
            console.error('[getRatingSystems] error:', error.message);
            return [];
        }
        // Map to ProjectRatingSystem shape – version/description may not exist on the older schema
        return (data !== null && data !== void 0 ? data : []).map((row) => {
            var _a, _b;
            return ({
                id: row.id,
                name: row.name,
                version: (_a = row.version) !== null && _a !== void 0 ? _a : null,
                description: (_b = row.description) !== null && _b !== void 0 ? _b : null,
            });
        });
    });
}
exports.getRuntimeDesyncSummary = cache(function getRuntimeDesyncSummary() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!env_1.env.isConfigured) {
            return { openDesyncCount: 0, queuedRepairs: 0, projectsImpacted: 0 };
        }
        const user = yield (0, exports.getCurrentUser)();
        if (!user || !["super_user", "super_admin"].includes(user.role)) {
            return { openDesyncCount: 0, queuedRepairs: 0, projectsImpacted: 0 };
        }
        const client = env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : (0, server_1.createClient)();
        const [{ count: openCount }, { count: queuedCount }, { data: projectRows }] = yield Promise.all([
            client.from("runtime_desync").select("*", { count: "exact", head: true }).eq("status", "open"),
            client.from("runtime_reconciliation_queue").select("*", { count: "exact", head: true }).in("status", ["pending", "retry", "processing"]),
            client.from("runtime_desync").select("project_id").eq("status", "open"),
        ]);
        const projectSet = new Set((projectRows !== null && projectRows !== void 0 ? projectRows : []).map((row) => row.project_id).filter(Boolean));
        return {
            openDesyncCount: Number(openCount !== null && openCount !== void 0 ? openCount : 0),
            queuedRepairs: Number(queuedCount !== null && queuedCount !== void 0 ? queuedCount : 0),
            projectsImpacted: projectSet.size,
        };
    });
});
exports.getUserActionQueue = cache(function getUserActionQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield (0, exports.getCurrentUser)();
        if (!user)
            return [];
        const client = (0, server_1.createClient)();
        const { data: assignments } = yield client
            .from("assignments")
            .select(`
      id,
      project_id,
      document_type,
      project_credit_id,
      projects!inner (name),
      project_credits!inner (credit_id, credit_code, credit_name, status)
    `)
            .eq("user_id", user.id)
            .eq("is_active", true);
        return (assignments !== null && assignments !== void 0 ? assignments : []).map((a) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return ({
                id: a.id,
                projectId: a.project_id,
                projectName: (_a = a.projects) === null || _a === void 0 ? void 0 : _a.name,
                projectCreditId: a.project_credit_id,
                documentType: (_b = a.document_type) !== null && _b !== void 0 ? _b : null,
                creditId: (_c = a.project_credits) === null || _c === void 0 ? void 0 : _c.credit_id,
                creditCode: (_e = (_d = a.project_credits) === null || _d === void 0 ? void 0 : _d.credit_code) !== null && _e !== void 0 ? _e : null,
                creditName: (_g = (_f = a.project_credits) === null || _f === void 0 ? void 0 : _f.credit_name) !== null && _g !== void 0 ? _g : null,
                status: (_h = a.project_credits) === null || _h === void 0 ? void 0 : _h.status,
            });
        });
    });
});
exports.getUserReviewQueue = cache(function getUserReviewQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield (0, exports.getCurrentUser)();
        if (!user)
            return [];
        // Only L1+ reviewer roles should see the review queue.
        // Contributors (architect, contractor, mep, client) should NOT see reviews.
        const reviewerRoles = ["owner", "L1", "project_admin", "super_admin", "super_user", "L3", "L5"];
        if (!reviewerRoles.includes(user.role))
            return [];
        const client = (0, server_1.createClient)();
        const adminClient = env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : client;
        // L1 (owner/PM) reviews L1_REVIEW (PM review) docs from L0
        // L3 (project_admin/super_admin/super_user) validates UNDER_L3_REVIEW docs from L1
        // L2 has no role in document workflows
        const isL3 = ["project_admin", "super_admin", "super_user", "L3", "L5"].includes(user.role);
        const isL1 = user.role === "owner" || user.role === "L1";
        const states = isL3
            ? ["UNDER_L3_REVIEW"]
            : isL1
                ? ["L1_REVIEW"]
                : ["L1_REVIEW", "UNDER_L3_REVIEW"]; // fallback
        const { data: docs, error } = yield adminClient
            .from("project_document")
            .select(`
      id,
      project_id,
      project_credit_id,
      file_name,
      doc_category,
      state,
      workflow_state,
      uploaded_by,
      projects!inner (name),
      project_credits (credit_code, credit_name)
    `)
            .in("workflow_state", states)
            .eq("is_latest", true)
            .neq("uploaded_by", user.id); // Never review your own uploads
        return (docs !== null && docs !== void 0 ? docs : []).map((d) => {
            var _a, _b, _c;
            return ({
                id: d.id,
                projectId: d.project_id,
                projectCreditId: d.project_credit_id,
                projectName: (_a = d.projects) === null || _a === void 0 ? void 0 : _a.name,
                fileName: d.file_name,
                docCategory: d.doc_category,
                state: normalizeWorkflowState(d.workflow_state || d.state),
                creditCode: ((_b = d.project_credits) === null || _b === void 0 ? void 0 : _b.credit_code) || "REVIEW",
                creditName: ((_c = d.project_credits) === null || _c === void 0 ? void 0 : _c.credit_name) || "Evidence Document"
            });
        });
    });
});
exports.getUserBlockerQueue = cache(function getUserBlockerQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield (0, exports.getCurrentUser)();
        if (!user)
            return [];
        const client = (0, server_1.createClient)();
        const states = ["REJECTED", "CLARIFICATION"];
        const { data: docs } = yield client
            .from("project_document")
            .select(`
      id,
      project_id,
      file_name,
      doc_category,
      state,
      workflow_state,
      rejection_reason,
      notes,
      projects!inner (name)
    `)
            .in("workflow_state", states)
            .eq("is_latest", true);
        return (docs !== null && docs !== void 0 ? docs : []).map((d) => {
            var _a;
            return ({
                id: d.id,
                projectId: d.project_id,
                projectName: (_a = d.projects) === null || _a === void 0 ? void 0 : _a.name,
                fileName: d.file_name,
                docCategory: d.doc_category,
                state: d.workflow_state || d.state,
                reason: d.rejection_reason || d.notes
            });
        });
    });
});
