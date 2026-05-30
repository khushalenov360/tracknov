/**
 * Tracknov Knowledge Governance - Canonical Truth Registry
 * Holds the authoritative, immutable source of verified HVAC, Manufacturer, and ESG ontology definitions.
 */

export type CanonicalKnowledgeEntry = {
  id: string;
  category:
    | "MANUFACTURER"
    | "UNIT"
    | "FRAMEWORK_TERM"
    | "HVAC_STANDARD"
    | "SEMANTIC_ALIAS";
  canonicalValue: string;
  aliases: string[];
  frameworkVersion?: string;
  confidence: number;
  version: number;
  approvedBy: string;
  traceId: string;
  replayHash: string;
  createdAt: string;
};

export class CanonicalTruthRegistry {
  private static registry: Map<string, CanonicalKnowledgeEntry> = new Map();

  static {
    // Seed initial bootstrap canonical definitions
    const seedEntries: CanonicalKnowledgeEntry[] = [
      {
        id: "tr-01",
        category: "MANUFACTURER",
        canonicalValue: "Daikin",
        aliases: ["daikin industries", "daikin europe", "daikin ac"],
        confidence: 1.0,
        version: 1,
        approvedBy: "L5_GOVERNOR",
        traceId: "bootstrap-001",
        replayHash: "HASH-DAIKIN-V1",
        createdAt: new Date().toISOString()
      },
      {
        id: "tr-02",
        category: "UNIT",
        canonicalValue: "kW",
        aliases: ["kw", "kilowatts", "k.w."],
        confidence: 1.0,
        version: 1,
        approvedBy: "L5_GOVERNOR",
        traceId: "bootstrap-002",
        replayHash: "HASH-KW-V1",
        createdAt: new Date().toISOString()
      },
      {
        id: "tr-03",
        category: "HVAC_STANDARD",
        canonicalValue: "COP",
        aliases: ["cop", "coefficient of performance", "c.o.p."],
        confidence: 1.0,
        version: 1,
        approvedBy: "L5_GOVERNOR",
        traceId: "bootstrap-003",
        replayHash: "HASH-COP-V1",
        createdAt: new Date().toISOString()
      }
    ];

    seedEntries.forEach(entry => this.registry.set(this.makeKey(entry.category, entry.canonicalValue, entry.version), entry));
  }

  private static makeKey(category: string, value: string, version: number): string {
    return `${category}:${value.toLowerCase()}:${version}`;
  }

  public static getEntry(category: CanonicalKnowledgeEntry["category"], value: string, version: number = 1): CanonicalKnowledgeEntry | null {
    return this.registry.get(this.makeKey(category, value, version)) || null;
  }

  public static listEntries(): CanonicalKnowledgeEntry[] {
    return Array.from(this.registry.values());
  }

  public static register(entry: Omit<CanonicalKnowledgeEntry, "id" | "createdAt">): CanonicalKnowledgeEntry {
    const finalEntry: CanonicalKnowledgeEntry = {
      ...entry,
      id: `tr-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    this.registry.set(this.makeKey(entry.category, entry.canonicalValue, entry.version), finalEntry);
    return finalEntry;
  }
}
