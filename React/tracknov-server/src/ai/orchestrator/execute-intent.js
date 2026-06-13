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
exports.executeIntent = executeIntent;
const contracts_1 = require("@/ai/actions/contracts");
const operational_context_1 = require("@/ai/context/operational-context");
const router_1 = require("@/ai/intents/router");
const guard_1 = require("@/ai/permissions/guard");
const router_2 = require("@/ai/workflows/router");
function executeIntent(request) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const intent = (0, router_1.resolveIntentFromPrompt)(request.query);
        const contract = (0, contracts_1.getAIActionContract)(intent);
        if (intent === "general" || !contract) {
            return {
                ok: true,
                intent,
                message: "I can help with analysis, mapping suggestions, and workflow guidance from the current project context.",
                contract: null,
                nextSteps: ["Ask me to analyze a file", "Ask me to suggest likely credit mappings"],
            };
        }
        if (!(0, guard_1.canExecuteAIAction)(request.role, intent)) {
            return {
                ok: false,
                intent,
                actionId: contract.action_id,
                contract: { action_id: contract.action_id, action_name: contract.action_name },
                message: "Your role is not allowed to execute this action.",
                nextSteps: ["Ask a Project Admin, Owner, or Super User to perform this action"],
            };
        }
        const operationalContext = yield (0, operational_context_1.getOperationalContext)(request.userId);
        void operationalContext;
        const workflowResult = yield (0, router_2.routeWorkflowAction)({
            intent,
            query: request.query,
            projectId: (_a = request.projectContext.projectId) !== null && _a !== void 0 ? _a : null,
        });
        return {
            ok: workflowResult.ok,
            intent,
            actionId: contract.action_id,
            contract: { action_id: contract.action_id, action_name: contract.action_name },
            message: workflowResult.message,
            nextSteps: workflowResult.ok
                ? ["Review the updated workflow state", "Proceed with the next required submission step"]
                : ["Check project context", "Retry with a specific workflow action command"],
        };
    });
}
