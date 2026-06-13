"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectIdFromContext = getProjectIdFromContext;
exports.isFileQuestion = isFileQuestion;
exports.isUploadMappingIntent = isUploadMappingIntent;
exports.detectDocTypeFromAttachment = detectDocTypeFromAttachment;
exports.buildAttachmentAnalysisReply = buildAttachmentAnalysisReply;
function getProjectIdFromContext(context) {
    var _a, _b;
    const current = String((_a = context === null || context === void 0 ? void 0 : context.currentItem) !== null && _a !== void 0 ? _a : "");
    const match = current.match(/\/?projects\/([^/?#\s\/]+)/i);
    return (_b = match === null || match === void 0 ? void 0 : match[1]) !== null && _b !== void 0 ? _b : null;
}
function isFileQuestion(query) {
    const q = query.toLowerCase();
    return (q.includes("what is this file") ||
        q.includes("what's this file") ||
        q.includes("analyze this file") ||
        q.includes("analyse this file") ||
        q.includes("tell me about this file") ||
        q.includes("tell me more about the file") ||
        q.includes("file uploaded") ||
        q.includes("attached file") ||
        q.includes("about this file") ||
        q.includes("check this file") ||
        q.includes("read this file") ||
        q.includes("explain this file") ||
        q.includes("compare it") ||
        q.includes("recheck"));
}
function isUploadMappingIntent(query, options) {
    if ((options === null || options === void 0 ? void 0 : options.analysisOnly) === true) {
        return false;
    }
    const q = query.toLowerCase().trim();
    return (q.startsWith("upload this") ||
        q.startsWith("map this to") ||
        q.startsWith("submit this") ||
        q.startsWith("push this") ||
        q.includes("confirm upload") ||
        q.includes("upload this to") ||
        q.includes("map this file to"));
}
function detectDocTypeFromAttachment(name, mimeType) {
    const lower = name.toLowerCase();
    const mime = String(mimeType !== null && mimeType !== void 0 ? mimeType : "").toLowerCase();
    if (mime.includes("pdf") || lower.endsWith(".pdf"))
        return "Drawing / Narrative PDF";
    if (mime.includes("spreadsheet") || lower.endsWith(".xlsx") || lower.endsWith(".xls"))
        return "Tracker / Spreadsheet";
    if (mime.startsWith("image/"))
        return "Site Photo / Image Evidence";
    if (mime.includes("word") || lower.endsWith(".doc") || lower.endsWith(".docx"))
        return "Narrative / Report";
    return "Project document";
}
function buildAttachmentAnalysisReply(userName, file, ragMatches) {
    var _a;
    const kb = Math.max(1, Math.round(((_a = file.size) !== null && _a !== void 0 ? _a : 0) / 1024));
    const docType = detectDocTypeFromAttachment(file.name, file.mimeType);
    const hints = file.name.replace(/\.[^.]+$/, "").split(/[_\-\s]+/).filter(Boolean).slice(0, 6).join(", ");
    const likelyCredits = ragMatches
        .map((item) => {
        var _a, _b;
        return ({
            code: String((_b = (_a = item.metadata) === null || _a === void 0 ? void 0 : _a.credit_code) !== null && _b !== void 0 ? _b : "").trim(),
            score: item.score,
            reason: item.content.slice(0, 120).replace(/\s+/g, " ").trim(),
        });
    })
        .filter((item) => item.code.length > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    const creditLines = likelyCredits.length > 0
        ? likelyCredits.map((item, index) => {
            const confidence = item.score >= 0.75 ? "high" : item.score >= 0.6 ? "medium" : "low";
            return `${index + 1}. ${item.code} (${confidence} confidence) - ${item.reason}`;
        })
        : ["No strong credit match yet from project context. I can still map once you confirm the target credit code."];
    return [
        `Hi ${userName}, I checked your attached file.`,
        "",
        `Document type detected: ${docType}`,
        `File: ${file.name} (${kb} KB)`,
        "",
        "Key data points found:",
        `- Filename hints: ${hints || "not enough hints in filename"}`,
        `- MIME type: ${file.mimeType || "unknown"}`,
        "",
        "Likely credit matches:",
        ...creditLines,
        "",
        "You can now ask me to analyse relevance, compare against credits, or explicitly instruct me to upload/map the file.",
    ].join("\n");
}
