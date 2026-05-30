export class DeadlineMonitor {
  async getUpcoming(projectId: string) {
    return [
      { task: 'Submit Phase 1', date: '2024-12-01' }
    ];
  }
}
