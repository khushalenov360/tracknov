export class RoutingViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoutingViolation";
  }
}

export class EntityValidator {
  private static validCreditCodes = new Set([
    "EDA C1", "EDA C2", "EDA C3",
    "WC C1", "WC C2", "WC C3",
    "EA C1", "EA C2", "EA C3",
    "IE C1", "IE C2", "IE C3"
  ]);

  static validateCreditCode(code: string): void {
    if (!code) return;
    
    // Check if the code is in the valid set (case-insensitive for practical purposes)
    const upperCode = code.toUpperCase();
    if (!this.validCreditCodes.has(upperCode)) {
      throw new RoutingViolation(`Invalid credit code: ${code}. Unable to assess readiness.`);
    }
  }

  static validateEntity(entity: any): void {
    if (entity && entity.creditCode) {
      this.validateCreditCode(entity.creditCode);
    }
  }
}
