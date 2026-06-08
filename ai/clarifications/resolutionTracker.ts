export class ResolutionTracker {
  track(clarificationId: string, actions: any[]) {
    return {
      clarificationId,
      status: 'PLAN_GENERATED',
      pendingActions: actions,
      completedActions: []
    };
  }
}
