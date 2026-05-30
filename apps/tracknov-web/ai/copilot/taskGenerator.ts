export class TaskGenerator {
  async getTodayPriorities(projectId: string) {
    return ['Review EA Credit Clarifications'];
  }

  async getSuggestedActions(projectId: string) {
    return ['Upload Water Balance calculations'];
  }
}
