"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
const server_1 = require("next/server");
const buckets = new Map();
function getClientIp(request) {
    var _a, _b, _c, _d;
    const header = (_c = (_b = (_a = request.headers.get("x-forwarded-for")) !== null && _a !== void 0 ? _a : request.headers.get("x-real-ip")) !== null && _b !== void 0 ? _b : request.headers.get("cf-connecting-ip")) !== null && _c !== void 0 ? _c : "unknown";
    return ((_d = header.split(",")[0]) === null || _d === void 0 ? void 0 : _d.trim()) || "unknown";
}
function checkRateLimit(request, options) {
    const now = Date.now();
    const ip = getClientIp(request);
    const mapKey = `${options.key}:${ip}`;
    const current = buckets.get(mapKey);
    if (!current || current.resetAt <= now) {
        buckets.set(mapKey, { count: 1, resetAt: now + options.windowMs });
        return null;
    }
    if (current.count >= options.limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
        return server_1.NextResponse.json({
            ok: false,
            error: "Too many requests. Please retry shortly.",
            retryAfterSeconds,
        }, {
            status: 429,
            headers: {
                "Retry-After": String(retryAfterSeconds),
                "X-RateLimit-Limit": String(options.limit),
                "X-RateLimit-Remaining": "0",
            },
        });
    }
    current.count += 1;
    buckets.set(mapKey, current);
    return null;
}
