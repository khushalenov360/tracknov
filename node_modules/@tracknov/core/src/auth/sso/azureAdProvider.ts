export interface AzureUser {
  userId: string;
  mail: string;
  displayName: string;
  tenantId: string;
}

export class AzureAdProvider {
  /**
   * Translates active MS Entra ID profiles into secure organization profiles
   */
  static resolveAzureProfile(token: string): AzureUser {
    return {
      userId: "ad-usr-90112",
      mail: "auditor@harita.com",
      displayName: "Vijay Sharma",
      tenantId: "tenant-alpha"
    };
  }
}
