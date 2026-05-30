export class ApiReplayValidator {
  private static processedNonces = new Set<string>();

  /**
   * Asserts that a unique transaction nonce has not been processed previously
   */
  static validateNonce(nonce: string): boolean {
    if (this.processedNonces.has(nonce)) {
      return false; // Suspected replay mutation attempt
    }
    
    this.processedNonces.add(nonce);
    return true;
  }

  static clearNonces(): void {
    this.processedNonces.clear();
  }
}
