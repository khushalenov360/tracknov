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
exports.MemoryStore = void 0;
class MemoryStore {
    constructor(supabaseAdmin) {
        this.supabaseAdmin = supabaseAdmin;
    }
    storeMemory(projectId, entityType, entityId, contextData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.supabaseAdmin
                .from('ai_memory')
                .insert({
                project_id: projectId,
                entity_type: entityType,
                entity_id: entityId,
                context_data: contextData,
            })
                .select()
                .single();
            if (error)
                throw new Error(error.message);
            return data;
        });
    }
    getMemory(projectId, entityType, entityId) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = this.supabaseAdmin
                .from('ai_memory')
                .select('*')
                .eq('project_id', projectId)
                .eq('entity_type', entityType);
            if (entityId) {
                query = query.eq('entity_id', entityId);
            }
            const { data, error } = yield query;
            if (error)
                throw new Error(error.message);
            return data;
        });
    }
}
exports.MemoryStore = MemoryStore;
