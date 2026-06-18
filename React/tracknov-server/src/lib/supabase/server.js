"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("@/lib/env");
const request_auth_1 = require("@/lib/supabase/request-auth");
function createClient() {
    const accessToken = (0, request_auth_1.getSupabaseAccessToken)();
    if (accessToken) {
        return (0, supabase_js_1.createClient)(env_1.env.supabaseUrl, env_1.env.supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return (0, supabase_js_1.createClient)(env_1.env.supabaseUrl, env_1.env.supabaseAnonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
