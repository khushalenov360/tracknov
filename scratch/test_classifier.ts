import { QuestionClassifier, QuestionType } from "../packages/harita-engine/src/intelligence/reasoning/question-classifier";

const tests: Array<{ query: string; expected: QuestionType }> = [
  // Existing intents
  { query: "What documents are required for EDA C1?",          expected: QuestionType.KNOWLEDGE_QUERY },
  { query: "Who uploads calculations?",                        expected: QuestionType.KNOWLEDGE_QUERY },
  { query: "Can EDA C1 be submitted today?",                   expected: QuestionType.SUBMISSION_READINESS },
  { query: "Is WE C1 ready for submission?",                   expected: QuestionType.SUBMISSION_READINESS },
  { query: "Assess evidence for EDA C1",                       expected: QuestionType.SUBMISSION_READINESS },
  // Upload Copilot (tool-invocation path, tested via classifier fallback)
  // These naturally land in the LLM's function-calling path via assessUpload
  // Narrative Assistance
  { query: "Write a narrative for EDA C1",                     expected: QuestionType.NARRATIVE_ASSISTANCE },
  { query: "Draft a narrative for WE C1",                      expected: QuestionType.NARRATIVE_ASSISTANCE },
  { query: "Help me write the narrative for EDA C1",           expected: QuestionType.NARRATIVE_ASSISTANCE },
  // Clarification Assistance
  { query: "Help me respond to the clarification for EDA C1",  expected: QuestionType.CLARIFICATION_ASSISTANCE },
  { query: "Draft a clarification response for EDA C1",        expected: QuestionType.CLARIFICATION_ASSISTANCE },
  { query: "How do I reply to the rejection on WE C1?",        expected: QuestionType.CLARIFICATION_ASSISTANCE },
  // Contributor Copilot
  { query: "What should the Architect do next?",               expected: QuestionType.CONTRIBUTOR_COPILOT },
  { query: "Show me the Architect's pending items",            expected: QuestionType.CONTRIBUTOR_COPILOT },
  { query: "What does the MEP Consultant need to upload?",     expected: QuestionType.CONTRIBUTOR_COPILOT },
];

let passed = 0, failed = 0;
for (const { query, expected } of tests) {
  const result = QuestionClassifier.classify(query);
  const ok = result === expected;
  if (ok) passed++; else failed++;
  console.log(`${ok ? "PASS ✓" : `FAIL ✗ (got ${result})`} [${expected}] — "${query}"`);
}
console.log(`\n${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
