"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
const ssr_1 = require("@supabase/ssr");
function createClient() {
    var _a, _b;
    const supabaseUrl = (_a = process.env.NEXT_PUBLIC_SUPABASE_URL) !== null && _a !== void 0 ? _a : "";
    const supabaseAnonKey = (_b = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) !== null && _b !== void 0 ? _b : "";
    return (0, ssr_1.createBrowserClient)(supabaseUrl, supabaseAnonKey);
}
