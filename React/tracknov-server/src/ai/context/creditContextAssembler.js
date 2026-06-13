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
exports.creditContextAssembler = void 0;
const admin_1 = require("@/lib/supabase/admin");
const capabilityEngine_1 = require("@tracknov/core/auth/capabilityEngine");
exports.creditContextAssembler = {
    assembleContext(projectId, creditId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { allowed } = yield (0, capabilityEngine_1.assertCapability)(projectId, "view_project");
            if (!allowed) {
                return "Access Denied.";
            }
            const admin = (0, admin_1.createAdminClient)();
            const { data: credit } = yield admin
                .from("project_credits")
                .select("credit_code, credit_name, completion_pct, status, responsible_role")
                .eq("id", creditId)
                .single();
            if (!credit)
                return "Credit not found.";
            return `
# Credit Context
- **Code:** ${credit.credit_code}
- **Name:** ${credit.credit_name}
- **Completion:** ${credit.completion_pct}%
- **Status:** ${credit.status}
- **Responsible:** ${credit.responsible_role}
    `.trim();
        });
    }
};
