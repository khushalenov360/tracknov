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
exports.updateSession = updateSession;
const ssr_1 = require("@supabase/ssr");
const server_1 = require("next/server");
const env_1 = require("@/lib/env");
// Routes that require authentication
const PROTECTED_PREFIXES = [
    "/dashboard",
    "/projects",
    "/documents",
    "/team",
    "/credits",
    "/review-queue",
    "/welcome",
    "/invite",
];
// Routes that are public (login, signup, etc.)
const PUBLIC_PREFIXES = ["/login", "/forgot-password", "/reset-password", "/signup", "/auth", "/_next", "/favicon.ico", "/api/auth"];
function isProtectedRoute(pathname) {
    if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return false;
    }
    return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
function updateSession(request) {
    return __awaiter(this, void 0, void 0, function* () {
        const { pathname } = request.nextUrl;
        // Never block public routes (login/auth/assets) on an auth roundtrip.
        if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
            return server_1.NextResponse.next();
        }
        let response = server_1.NextResponse.next();
        if (!env_1.env.isConfigured) {
            return response;
        }
        const supabase = (0, ssr_1.createServerClient)(env_1.env.supabaseUrl, env_1.env.supabaseAnonKey, {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = server_1.NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                },
            },
        });
        const { data: { session }, } = yield supabase.auth.getSession();
        const user = session === null || session === void 0 ? void 0 : session.user;
        // Redirect unauthenticated users away from protected routes
        if (!user && isProtectedRoute(pathname)) {
            const loginUrl = request.nextUrl.clone();
            loginUrl.pathname = "/login";
            loginUrl.searchParams.set("next", pathname);
            return server_1.NextResponse.redirect(loginUrl);
        }
        return response;
    });
}
