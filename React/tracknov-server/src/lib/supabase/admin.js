"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminClient = createAdminClient;
const supabase_js_1 = require("@supabase/supabase-js");
const server_1 = require("@/lib/supabase/server");
const env_1 = require("@/lib/env");
function createAdminClient() {
    if (!env_1.env.supabaseServiceRoleKey) {
        console.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to normal client for admin operations.");
        return (0, server_1.createClient)();
    }
    return (0, supabase_js_1.createClient)(env_1.env.supabaseUrl, env_1.env.supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
