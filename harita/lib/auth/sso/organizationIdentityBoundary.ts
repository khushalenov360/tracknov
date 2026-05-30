export class OrganizationIdentityBoundary {
  /**
   * Prevents credential usage outside defined corporate domain boundaries
   */
  static validateBoundary(email: string, allowedDomains: string[]): boolean {
    const parts = email.split("@");
    if (parts.length < 2) return false;
    const domain = parts[1].toLowerCase();
    return allowedDomains.map((d) => d.toLowerCase()).includes(domain);
  }
}
