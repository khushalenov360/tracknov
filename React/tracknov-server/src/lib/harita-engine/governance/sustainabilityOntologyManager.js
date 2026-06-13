"use strict";
/**
 * Tracknov Knowledge Governance - Sustainability Ontology Manager
 * Orchestrates growth, validation, and tags structure for Framework ESG taxonomies.
 */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SustainabilityOntologyManager = void 0;
class SustainabilityOntologyManager {
    static getNode(code) {
        return this.ontologyNodes.get(code) || null;
    }
    static listNodes() {
        return Array.from(this.ontologyNodes.values());
    }
    static addNode(node, authorRole) {
        if (authorRole !== "super_admin" && authorRole !== "L5_GOVERNOR") {
            return false;
        }
        this.ontologyNodes.set(node.code, node);
        return true;
    }
}
exports.SustainabilityOntologyManager = SustainabilityOntologyManager;
_a = SustainabilityOntologyManager;
SustainabilityOntologyManager.ontologyNodes = new Map();
(() => {
    // Bootstrap core IGBC energy and water taxonomy nodes
    const initialNodes = [
        { code: "EE", name: "Energy Efficiency", description: "IGBC Energy performance optimization limits", rigorWeight: 1.2 },
        { code: "EE-C1", name: "Chiller Efficiency", description: "Coefficient of performance thresholds", parentCode: "EE", rigorWeight: 1.5 },
        { code: "WE", name: "Water Efficiency", description: "Indoor and outdoor water usage reduction standards", rigorWeight: 1.0 },
        { code: "MR", name: "Materials and Resources", description: "Recycled content and regional sourcing", rigorWeight: 0.9 }
    ];
    initialNodes.forEach(node => _a.ontologyNodes.set(node.code, node));
})();
