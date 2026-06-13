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
exports.projectContextAssembler = void 0;
const admin_1 = require("@/lib/supabase/admin");
const capabilityEngine_1 = require("@tracknov/core/auth/capabilityEngine");
exports.projectContextAssembler = {
    assembleContext(projectId, userRole) {
        return __awaiter(this, void 0, void 0, function* () {
            const { allowed } = yield (0, capabilityEngine_1.assertCapability)(projectId, "view_project");
            if (!allowed) {
                return "Access Denied: You do not have permission to access context for this project.";
            }
            const admin = (0, admin_1.createAdminClient)();
            const { data: project } = yield admin
                .from("projects")
                .select("name, client, location, certification_state, target_rating")
                .eq("id", projectId)
                .single();
            if (!project)
                return "Project not found.";
            return `
# Project Context
- **Name:** ${project.name}
- **Client:** ${project.client || "N/A"}
- **Location:** ${project.location || "N/A"}
- **Certification State:** ${project.certification_state}
- **Target Rating:** ${project.target_rating}
    `.trim();
        });
    }
};
