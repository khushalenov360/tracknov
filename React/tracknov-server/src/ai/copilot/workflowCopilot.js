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
exports.WorkflowCopilot = void 0;
const projectMonitor_1 = require("./projectMonitor");
const riskMonitor_1 = require("./riskMonitor");
const deadlineMonitor_1 = require("./deadlineMonitor");
const taskGenerator_1 = require("./taskGenerator");
class WorkflowCopilot {
    constructor() {
        this.project = new projectMonitor_1.ProjectMonitor();
        this.risk = new riskMonitor_1.RiskMonitor();
        this.deadline = new deadlineMonitor_1.DeadlineMonitor();
        this.task = new taskGenerator_1.TaskGenerator();
    }
    generateDashboardWidget(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                priorities: yield this.task.getTodayPriorities(projectId),
                pendingClarifications: 2,
                blockedCredits: yield this.project.getBlockedCredits(projectId),
                upcomingDeadlines: yield this.deadline.getUpcoming(projectId),
                suggestedActions: yield this.task.getSuggestedActions(projectId)
            };
        });
    }
}
exports.WorkflowCopilot = WorkflowCopilot;
