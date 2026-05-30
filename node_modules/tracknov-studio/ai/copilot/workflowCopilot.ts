import { ProjectMonitor } from './projectMonitor';
import { RiskMonitor } from './riskMonitor';
import { DeadlineMonitor } from './deadlineMonitor';
import { TaskGenerator } from './taskGenerator';

export class WorkflowCopilot {
  project = new ProjectMonitor();
  risk = new RiskMonitor();
  deadline = new DeadlineMonitor();
  task = new TaskGenerator();

  async generateDashboardWidget(projectId: string) {
    return {
      priorities: await this.task.getTodayPriorities(projectId),
      pendingClarifications: 2,
      blockedCredits: await this.project.getBlockedCredits(projectId),
      upcomingDeadlines: await this.deadline.getUpcoming(projectId),
      suggestedActions: await this.task.getSuggestedActions(projectId)
    };
  }
}
