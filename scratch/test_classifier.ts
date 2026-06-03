import { QuestionClassifier, QuestionType } from "../packages/harita-engine/src/intelligence/reasoning/question-classifier";

const tests: Array<{ query: string; expected: QuestionType }> = [
  { query: "Can EDA C1 be submitted today?",          expected: QuestionType.SUBMISSION_READINESS },
  { query: "Is WE C1 ready for submission?",           expected: QuestionType.SUBMISSION_READINESS },
  { query: "Assess evidence for EDA C1",              expected: QuestionType.SUBMISSION_READINESS },
  { query: "What documents are required for EDA C1?", expected: QuestionType.KNOWLEDGE_QUERY },
  { query: "Who uploads calculations?",               expected: QuestionType.KNOWLEDGE_QUERY },
];

let passed = 0;
let failed = 0;

for (const { query, expected } of tests) {
  const result = QuestionClassifier.classify(query);
  const ok = result === expected;
  if (ok) passed++; else failed++;
  console.log(`${ok ? "PASS ✓" : "FAIL ✗"} [${result}] — "${query}"`);
}

console.log(`\n${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
