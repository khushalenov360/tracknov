"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canExecuteAIAction = canExecuteAIAction;
const contracts_1 = require("@/ai/actions/contracts");
function canExecuteAIAction(role, actionId) {
    const contract = (0, contracts_1.getAIActionContract)(actionId);
    if (!contract)
        return false;
    return contract.allowed_roles.includes(role);
}
