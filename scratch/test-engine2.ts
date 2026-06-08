import { QuestionClassifier, QuestionType } from "../packages/harita-engine/src/intelligence/reasoning/question-classifier";
async function test() {
  const query = "Who is overloaded?";
  const qType = QuestionClassifier.classify(query);
  console.log("QTYPE:", qType);
}
test().catch(console.error);
