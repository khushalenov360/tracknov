"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
const ssr_1 = require("@supabase/ssr");
function createClient() {
    var _a, _b, _c, _d;
    const supabaseUrl = (_b = (_a = process.env.SUPABASE_URL) !== null && _a !== void 0 ? _a : process.env.VITE_SUPABASE_URL) !== null && _b !== void 0 ? _b : "";
    const supabaseAnonKey = (_d = (_c = process.env.SUPABASE_ANON_KEY) !== null && _c !== void 0 ? _c : process.env.VITE_SUPABASE_ANON_KEY) !== null && _d !== void 0 ? _d : "";
    return (0, ssr_1.createBrowserClient)(supabaseUrl, supabaseAnonKey);
}
