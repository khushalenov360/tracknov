export class NavigationLoopDetector {
  /**
   * Evaluates navigation paths to detect back-and-forth loops
   */
  static detectLoop(history: string[]): boolean {
    if (history.length < 4) return false;

    // Detect simple loops like A -> B -> A -> B
    const len = history.length;
    const path = history.slice(len - 4);
    
    if (path[0] === path[2] && path[1] === path[3]) {
      return true; // Navigation loop confirmed
    }

    return false;
  }
}
