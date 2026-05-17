/**
 * Tracknov Knowledge Governance - Semantic Privacy Filter
 * Filters private strings or credentials from vector query spaces.
 */

export class SemanticPrivacyFilter {
  private static readonly BLACKLIST_TERMS = [
    "secret",
    "password",
    "apikey",
    "token",
    "invoice-id",
    "client-name"
  ];

  /**
   * Cleans vector search fields to suppress potential credentials leakage.
   */
  public static filterPrivateTerms(query: string): string {
    let cleanQuery = query;
    for (const term of this.BLACKLIST_TERMS) {
      const regex = new RegExp(term, "gi");
      cleanQuery = cleanQuery.replace(regex, "[FILTERED]");
    }
    return cleanQuery;
  }
}
