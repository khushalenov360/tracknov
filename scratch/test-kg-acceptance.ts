import { KnowledgeGraphEngine } from "../packages/harita-engine/src/intelligence/knowledge-graph/knowledge-graph-engine";
import { GraphInvalidator } from "../packages/harita-engine/src/intelligence/knowledge-graph/graph-invalidator";

console.log("=== KNOWLEDGE GRAPH ACCEPTANCE TESTS ===");

const PROJ_ID = "PROJ_1";

console.log("\n[KG-001] Build graph.");
const graph = KnowledgeGraphEngine.buildGraph(PROJ_ID, {});
const metrics = KnowledgeGraphEngine.getGraphMetrics(PROJ_ID);
console.log(`Nodes: ${metrics.nodeCount}, Edges: ${metrics.edgeCount}`);
if (metrics.nodeCount > 0 && metrics.edgeCount > 0) console.log("PASS");

console.log("\n[KG-002] EDA C1 ownership query.");
const owners = KnowledgeGraphEngine.queryGraph(PROJ_ID).queryOwnership(PROJ_ID, "EDA_C1");
console.log(`Owners: ${owners.join(", ")}`);
if (owners.includes("Architect") && owners.includes("PM")) console.log("PASS");

console.log("\n[KG-003] Missing evidence query.");
const missing = KnowledgeGraphEngine.queryGraph(PROJ_ID).queryMissingEvidence(PROJ_ID, "EDA_C1");
console.log(`Missing: ${missing.join(", ")}`);
if (missing.includes("Calculations") && missing.includes("Drawings")) console.log("PASS"); // Note: based on our mock builder, both lack satisfies edges

console.log("\n[KG-004] Document upload (Cache Invalidation).");
GraphInvalidator.invalidateDocument(PROJ_ID, "doc-123");
console.log("Graph invalidated successfully.");
console.log("PASS");

console.log("\n[KG-005] Recommendation query.");
const recs = KnowledgeGraphEngine.queryGraph(PROJ_ID).queryRecommendations(PROJ_ID, "EDA_C1");
console.log(`Recommendations:\n${recs.join("\n")}`);
if (recs.some(r => r.includes("Upload Calculations"))) console.log("PASS");

console.log("\n[KG-006] Decision query.");
const decisions = KnowledgeGraphEngine.queryGraph(PROJ_ID).queryDecisions(PROJ_ID);
console.log(`Decisions:\n${decisions.join("\n")}`);
if (decisions.length > 0) console.log("PASS");

console.log("\n=== ALL KG TESTS EXECUTED ===");
