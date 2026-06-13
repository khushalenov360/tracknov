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
exports.routeWorkflowAction = routeWorkflowAction;
const orchestrator_1 = require("@tracknov/harita-engine/harita/orchestrator");
function routeWorkflowAction(input) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input.projectId) {
            return { ok: false, message: "Project context is required for workflow execution." };
        }
        const result = yield (0, orchestrator_1.orchestrateHaritaResponse)({
            query: input.query,
            projectId: input.projectId,
            intentHint: "upload",
        });
        if ("status" in result && result.status === "fallback") {
            return { ok: false, message: result.message };
        }
        return { ok: true, message: "Workflow orchestration completed.", result };
    });
}
