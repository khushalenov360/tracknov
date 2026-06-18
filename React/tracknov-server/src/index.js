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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const server_1 = require("./lib/supabase/server");
const request_auth_1 = require("./lib/supabase/request-auth");
const document_service_1 = require("./lib/harita-engine/services/document-service");
const DocumentParser_1 = require("./lib/harita-engine/document-intelligence/DocumentParser");
const DocumentClassifier_1 = require("./lib/harita-engine/document-intelligence/DocumentClassifier");
const app = (0, express_1.default)();
const PORT = 5101;
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
function normalizeRole(value) {
    return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}
function resolveCurrentUserFromRequest() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const client = (0, server_1.createClient)();
        const { data: { user }, } = yield client.auth.getUser();
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
        const roleFromProfile = typeof (profile === null || profile === void 0 ? void 0 : profile.global_role) === "string" ? normalizeRole(profile.global_role) : null;
        const roleFromMetadata = typeof ((_a = user.user_metadata) === null || _a === void 0 ? void 0 : _a.role) === "string" ? normalizeRole(user.user_metadata.role) : null;
        return {
            id: user.id,
            email: (_b = user.email) !== null && _b !== void 0 ? _b : "",
            role: (roleFromProfile || roleFromMetadata || "consultant"),
        };
    });
}
function toHeadersRecord(headers) {
    const normalized = new Headers();
    for (const [key, value] of Object.entries(headers)) {
        if (Array.isArray(value)) {
            normalized.set(key, value.join(", "));
        }
        else if (typeof value === "string") {
            normalized.set(key, value);
        }
    }
    return normalized;
}
const attachmentParser = new DocumentParser_1.DocumentParser();
const attachmentClassifier = new DocumentClassifier_1.DocumentClassifier();
const COMPLIANCE_SIGNAL_PATTERNS = [
    /\bigbc\b/i,
    /\bgreen\b/i,
    /\bfixture\b/i,
    /\bflow\s*rate\b/i,
    /\blighting\b/i,
    /\bhvac\b/i,
    /\bvoc\b/i,
    /\bmsds\b/i,
    /\benergy\b/i,
    /\bwater\b/i,
    /\bcertificate\b/i,
    /\bdatasheet\b/i,
    /\bdeclaration\b/i,
    /\btechnical\b/i,
    /\bmanufacturer\b/i,
];
function normalizeDocumentsRequired(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
        type: typeof item.type === "string" ? item.type : "",
        label: typeof item.label === "string" ? item.label : (typeof item.type === "string" ? item.type : "Document"),
        required: Boolean(item.required),
        assigned_user_id: typeof item.assigned_user_id === "string" ? item.assigned_user_id : null,
        assigned_role: typeof item.assigned_role === "string" ? normalizeRole(item.assigned_role) : null,
    }))
        .filter((item) => Boolean(item.type));
}
function canSeeEvidenceTarget(args) {
    var _a, _b, _c, _d;
    const role = normalizeRole(args.projectRole || args.user.role);
    const assignedUserId = String((_b = (_a = args.credit) === null || _a === void 0 ? void 0 : _a.assigned_user_id) !== null && _b !== void 0 ? _b : "").trim();
    if (args.requirement.assigned_user_id) {
        return args.requirement.assigned_user_id === args.user.id;
    }
    if (assignedUserId) {
        return assignedUserId === args.user.id;
    }
    if (["architect", "mep", "contractor", "consultant"].includes(role)) {
        const requirementRole = args.requirement.assigned_role ? normalizeRole(args.requirement.assigned_role) : "";
        const responsibleRole = String((_d = (_c = args.credit) === null || _c === void 0 ? void 0 : _c.responsible_role) !== null && _d !== void 0 ? _d : "").trim().toLowerCase();
        return requirementRole ? requirementRole === role : responsibleRole === role;
    }
    return ["owner", "project_admin", "super_admin", "super_user"].includes(role);
}
function hasComplianceSignals(text, evidenceType) {
    if (evidenceType && evidenceType !== "UNKNOWN") {
        return true;
    }
    return COMPLIANCE_SIGNAL_PATTERNS.some((pattern) => pattern.test(text));
}
app.post("/api/assistant/attachment-prepare", express_1.default.raw({ type: () => true, limit: "60mb" }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
    try {
        yield (0, request_auth_1.runWithSupabaseAccessToken)(accessToken, () => __awaiter(void 0, void 0, void 0, function* () {
            const multipartRequest = new Request("http://localhost:5101/api/assistant/attachment-prepare", {
                method: "POST",
                headers: toHeadersRecord(req.headers),
                body: req.body,
                duplex: "half",
            });
            const formData = yield multipartRequest.formData();
            const file = formData.get("file");
            if (!(file instanceof File)) {
                return res.status(400).json({ ok: false, error: "A file is required." });
            }
            const user = yield resolveCurrentUserFromRequest();
            if (!user) {
                return res.status(401).json({ ok: false, error: "Session expired." });
            }
            const buffer = Buffer.from(yield file.arrayBuffer());
            const parsed = yield attachmentParser.parse(buffer, file.name);
            const parsedText = String(parsed.text || "").trim().slice(0, 12000);
            const evidenceType = attachmentClassifier.classifyText(parsedText, file.name) || "UNKNOWN";
            const complianceSignals = hasComplianceSignals(parsedText, evidenceType);
            const summaryParts = [
                evidenceType !== "UNKNOWN" ? `Detected evidence type: ${evidenceType}.` : "No deterministic evidence type match was found.",
                parsedText ? `Extracted ${parsedText.length} characters of readable text.` : "No readable text could be extracted from this file.",
                complianceSignals ? "Compliance-aligned signals were detected in the attachment." : "No clear compliance-aligned signals were detected in the attachment.",
            ];
            const payload = {
                fileName: file.name,
                mimeType: file.type || "application/octet-stream",
                fileSize: file.size,
                parsedText,
                summary: summaryParts.join(" "),
                evidenceType,
                hasComplianceSignals: complianceSignals,
                extractedAt: new Date().toISOString(),
            };
            return res.status(200).json({
                ok: true,
                attachment: payload,
            });
        }));
    }
    catch (error) {
        console.error("[TRACKNOV SERVER] Attachment preparation failed:", error);
        return res.status(500).json({
            ok: false,
            error: (error === null || error === void 0 ? void 0 : error.message) || "Attachment preparation failed.",
        });
    }
}));
app.post("/api/assistant/credit-evidence-upload", express_1.default.raw({ type: () => true, limit: "60mb" }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
    try {
        yield (0, request_auth_1.runWithSupabaseAccessToken)(accessToken, () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const multipartRequest = new Request("http://localhost:5101/api/assistant/credit-evidence-upload", {
                method: "POST",
                headers: toHeadersRecord(req.headers),
                body: req.body,
                duplex: "half",
            });
            const formData = yield multipartRequest.formData();
            const projectId = String((_a = formData.get("project_id")) !== null && _a !== void 0 ? _a : "").trim();
            const targetId = String((_b = formData.get("target_id")) !== null && _b !== void 0 ? _b : "").trim();
            const file = formData.get("file");
            if (!projectId || !targetId || !(file instanceof File)) {
                return res.status(400).json({ ok: false, error: "Project, target, and file are required." });
            }
            const user = yield resolveCurrentUserFromRequest();
            if (!user) {
                return res.status(401).json({ ok: false, error: "Session expired." });
            }
            const [projectCreditId, docCategory] = targetId.split("::");
            if (!projectCreditId || !docCategory) {
                return res.status(400).json({ ok: false, error: "Invalid upload target." });
            }
            const admin = (0, server_1.createClient)();
            const { data: credit } = yield admin
                .from("project_credits")
                .select("id, credit_id, credit_code, credit_name, documents_required")
                .eq("project_id", projectId)
                .eq("id", projectCreditId)
                .maybeSingle();
            if (!credit) {
                return res.status(404).json({ ok: false, error: "Selected credit target no longer exists." });
            }
            const requirement = normalizeDocumentsRequired(credit.documents_required).find((item) => item.type === docCategory);
            if (!requirement) {
                return res.status(400).json({ ok: false, error: "Selected evidence requirement is no longer available." });
            }
            const uploadResult = yield document_service_1.documentService.uploadDocument(user, {
                projectId,
                creditId: String((_c = credit.credit_id) !== null && _c !== void 0 ? _c : ""),
                projectCreditId: String(credit.id),
                docCategory,
                requirementSlot: requirement.label || requirement.type,
                notes: `Uploaded through Harita Credit Evidence Analyzer for ${String((_d = credit.credit_code) !== null && _d !== void 0 ? _d : "").trim()}.`,
                file,
                idempotencyKey: `harita-${projectId}-${projectCreditId}-${docCategory}-${Date.now()}`,
            });
            return res.status(200).json({
                ok: true,
                documentId: uploadResult.id,
                projectCreditId: credit.id,
                creditId: (_e = credit.credit_id) !== null && _e !== void 0 ? _e : null,
                creditCode: credit.credit_code,
                creditName: credit.credit_name,
                docCategory,
                requirementLabel: requirement.label || requirement.type,
                message: `Evidence uploaded for ${credit.credit_code} - ${requirement.label || requirement.type}.`,
                uploadedAt: new Date().toISOString(),
            });
        }));
    }
    catch (error) {
        console.error("[TRACKNOV SERVER] Evidence upload failed:", error);
        return res.status(500).json({
            ok: false,
            error: (error === null || error === void 0 ? void 0 : error.message) || "Upload failed.",
        });
    }
}));
app.post('/api/credit-evaluations', (req, res) => {
    try {
        const { creditCode, extractionPayload } = req.body;
        console.log(`[TRACKNOV SERVER] Evaluating credit: ${creditCode}`);
        let evaluationResult = null;
        if (creditCode === 'EE_Credit1') {
            const { IgbcScoreAuthority } = require('./services/igbc-score-authority');
            evaluationResult = IgbcScoreAuthority.verifyChillerEfficiency(extractionPayload);
        }
        else {
            return res.status(400).json({ success: false, message: 'Unsupported credit code' });
        }
        setTimeout(() => {
            return res.status(200).json({ success: true, evaluationResult });
        }, 1000);
    }
    catch (error) {
        console.error('[SERVER ERROR INTERCEPT]', error);
        return res.status(500).json({ error: error.message || 'Evaluation thread failed' });
    }
});
app.listen(PORT, () => {
    console.log(`[SERVER ACTIVE] Tracknov business server listening on http://localhost:${PORT}`);
});
