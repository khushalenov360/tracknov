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
exports.createClient = createClient;
const ssr_1 = require("@supabase/ssr");
const headers_1 = require("next/headers");
const env_1 = require("@/lib/env");
function createClient() {
    return (0, ssr_1.createServerClient)(env_1.env.supabaseUrl, env_1.env.supabaseAnonKey, {
        cookies: {
            getAll() {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        const cookieStore = yield (0, headers_1.cookies)();
                        return cookieStore.getAll();
                    }
                    catch (error) {
                        return [];
                    }
                });
            },
            setAll(cookiesToSet) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        const cookieStore = yield (0, headers_1.cookies)();
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                    }
                    catch (error) {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                });
            },
        },
    });
}
