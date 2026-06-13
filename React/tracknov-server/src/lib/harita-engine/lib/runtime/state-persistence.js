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
exports.StatePersistence = void 0;
const admin_1 = require("@/lib/supabase/admin");
class StatePersistence {
    static saveAgentState(projectId, sessionId, stateBlob) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = (0, admin_1.createAdminClient)();
            const { error } = yield client.from('harita_memory_state').upsert({
                project_id: projectId,
                session_id: sessionId,
                agent_state: stateBlob,
                updated_at: new Date().toISOString()
            }, { onConflict: 'project_id, session_id' });
            if (error) {
                console.error("Failed to save Harita memory state:", error);
                throw error;
            }
        });
    }
    static loadAgentState(projectId, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = (0, admin_1.createAdminClient)();
            const { data, error } = yield client
                .from('harita_memory_state')
                .select('agent_state')
                .eq('project_id', projectId)
                .eq('session_id', sessionId)
                .single();
            if (error && error.code !== 'PGRST116') {
                console.error("Failed to load Harita memory state:", error);
            }
            return (data === null || data === void 0 ? void 0 : data.agent_state) || null;
        });
    }
}
exports.StatePersistence = StatePersistence;
