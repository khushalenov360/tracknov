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
exports.MemoryAssembler = void 0;
class MemoryAssembler {
    constructor(store) {
        this.store = store;
    }
    assembleProjectContext(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const projectMemories = yield this.store.getMemory(projectId, 'project');
            const creditMemories = yield this.store.getMemory(projectId, 'credit');
            const clarificationMemories = yield this.store.getMemory(projectId, 'clarification');
            return {
                project: projectMemories,
                credits: creditMemories,
                clarifications: clarificationMemories,
            };
        });
    }
}
exports.MemoryAssembler = MemoryAssembler;
