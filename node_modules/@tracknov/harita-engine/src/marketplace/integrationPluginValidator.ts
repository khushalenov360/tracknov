export class IntegrationPluginValidator {
  /**
   * Performs static code verification to ensure sandboxed isolation compliance
   */
  static validatePluginStructure(code: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (code.includes("XMLHttpRequest") || code.includes("fetch(")) {
      issues.push("Unauthorized network request detected (must rely on tenant-scoped boundaries).");
    }

    if (code.includes("window.location") || code.includes("localStorage")) {
      issues.push("Unauthorized browser storage manipulation detected.");
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
