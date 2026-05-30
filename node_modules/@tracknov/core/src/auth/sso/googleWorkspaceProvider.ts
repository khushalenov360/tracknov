export interface GoogleProfile {
  email: string;
  verifiedEmail: boolean;
  hdDomain: string; // hosted domain
}

export class GoogleWorkspaceProvider {
  /**
   * Asserts hosted domain context for enterprise security
   */
  static verifyGoogleDomain(profile: GoogleProfile, allowedDomain: string): boolean {
    return profile.verifiedEmail && profile.hdDomain === allowedDomain;
  }
}
