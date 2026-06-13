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
exports.EvidenceMappingEngine = void 0;
const admin_1 = require("@/lib/supabase/admin");
class EvidenceMappingEngine {
    static evaluate(evidenceType) {
        return __awaiter(this, void 0, void 0, function* () {
            const supabase = (0, admin_1.createAdminClient)();
            const result = {
                suggestedCredits: [],
                responsibleRoles: []
            };
            if (!evidenceType || evidenceType === "UNKNOWN") {
                return result;
            }
            try {
                // Find evidence type ID
                const { data: evData } = yield supabase
                    .from("knowledge_evidence_type")
                    .select("id")
                    .eq("name", evidenceType)
                    .maybeSingle();
                if (!evData) {
                    return result;
                }
                // 1. Get Suggested Credits
                const { data: creditsData } = yield supabase
                    .from("credit_evidence_mapping")
                    .select("knowledge_credit(id, code)")
                    .eq("evidence_type_id", evData.id);
                if (creditsData) {
                    creditsData.forEach((row) => {
                        if (row.knowledge_credit) {
                            result.suggestedCredits.push({
                                creditCode: row.knowledge_credit.code,
                                creditId: row.knowledge_credit.id
                            });
                        }
                    });
                }
                // 2. Get Responsible Roles
                const { data: rolesData } = yield supabase
                    .from("workflow_document_responsibility")
                    .select("workflow_role(id, name), action")
                    .eq("evidence_type_id", evData.id);
                if (rolesData) {
                    rolesData.forEach((row) => {
                        if (row.workflow_role) {
                            result.responsibleRoles.push({
                                roleName: row.workflow_role.name,
                                roleId: row.workflow_role.id,
                                action: row.action
                            });
                        }
                    });
                }
            }
            catch (err) {
                console.error("[EvidenceMappingEngine] Error evaluating evidence mapping:", err);
            }
            return result;
        });
    }
}
exports.EvidenceMappingEngine = EvidenceMappingEngine;
