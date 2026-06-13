"use strict";
/**
 * Tracknov Knowledge Governance - Canonical Truth Registry
 * Holds the authoritative, immutable source of verified HVAC, Manufacturer, and ESG ontology definitions.
 */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanonicalTruthRegistry = void 0;
class CanonicalTruthRegistry {
    static makeKey(category, value, version) {
        return `${category}:${value.toLowerCase()}:${version}`;
    }
    static getEntry(category, value, version = 1) {
        return this.registry.get(this.makeKey(category, value, version)) || null;
    }
    static listEntries() {
        return Array.from(this.registry.values());
    }
    static register(entry) {
        const finalEntry = Object.assign(Object.assign({}, entry), { id: `tr-${Math.random().toString(36).substr(2, 9)}`, createdAt: new Date().toISOString() });
        this.registry.set(this.makeKey(entry.category, entry.canonicalValue, entry.version), finalEntry);
        return finalEntry;
    }
}
exports.CanonicalTruthRegistry = CanonicalTruthRegistry;
_a = CanonicalTruthRegistry;
CanonicalTruthRegistry.registry = new Map();
(() => {
    // Seed initial bootstrap canonical definitions
    const seedEntries = [
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
    seedEntries.forEach(entry => _a.registry.set(_a.makeKey(entry.category, entry.canonicalValue, entry.version), entry));
})();
