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
exports.ProjectReasoner = void 0;
class ProjectReasoner {
    constructor(graph) {
        this.graph = graph;
    }
    evaluate(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const projectNode = this.graph.getNode(projectId);
            if (!projectNode)
                throw new Error('Project not found in graph');
            // In a full implementation, this would aggregate credit health, deadlines, etc.
            return {
                projectHealth: 'HEALTHY',
                overdueItems: [],
                blockers: [],
                risks: [],
                nextBestActions: ['Review missing evidence for Energy credits'],
            };
        });
    }
}
exports.ProjectReasoner = ProjectReasoner;
