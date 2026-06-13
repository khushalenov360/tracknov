"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
exports.pct = pct;
exports.slugify = slugify;
exports.formatDateIST = formatDateIST;
exports.formatDateTimeIST = formatDateTimeIST;
exports.cleanRoleLabel = cleanRoleLabel;
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
function pct(value) {
    return `${Math.round(value)}%`;
}
function slugify(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
const istDateFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});
const istDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
});
function formatDateIST(value) {
    if (!value) {
        return "-";
    }
    return istDateFormatter.format(new Date(value));
}
function formatDateTimeIST(value) {
    if (!value) {
        return "-";
    }
    return `${istDateTimeFormatter.format(new Date(value))} IST`;
}
function cleanRoleLabel(label) {
    if (!label)
        return "";
    // Removes strings like "(L0)", "(L1)", " (L2)" etc., even if nested or spaced weirdly
    return label
        .replace(/\s*\(L\d\)/gi, "")
        .replace(/\s*\(\s*L\d\s*\)/gi, "")
        .replace(/\s*\(\s*\)/g, "")
        .trim();
}
