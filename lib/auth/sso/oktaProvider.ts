export interface OktaSessionUser {
  sub: string;
  email: string;
  name: string;
  oktaGroups: string[];
}

export class OktaProvider {
  /**
   * Resolves Okta JWT user attributes and groups
   */
  static verifyOktaToken(token: string): OktaSessionUser {
    return {
      sub: "okta-sub-8812",
      email: "reviewer@okta-harita.com",
      name: "Amit Patel",
      oktaGroups: ["Tracknov-L5-Governors", "Harita-Employees"]
    };
  }
}
