export class ThrottleSimulator {
  /**
   * Simulates heavy JS thread delays to verify client queue preservation
   */
  static simulateCpuThrottle(delayMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, delayMs);
    });
  }
}
