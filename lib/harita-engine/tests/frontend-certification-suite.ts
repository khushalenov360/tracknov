import { QuestionType } from "../intelligence/reasoning/question-classifier";
import { intentRoutingGovernor } from "../runtime/intent-routing-governor";
import { submissionReadinessEngine } from "../services/submission-readiness-engine";
import { ReviewCriteriaValidator } from "../engines/review-criteria-validator";
import { DocumentEvidenceExtractor } from "../document-intelligence/document-evidence-extractor";

export interface TestResult {
  suite: string;
  passed: boolean;
  score: number;
  expected: any;
  actual: any;
  error?: string;
}

export class FrontendCertificationSuite {
  private results: TestResult[] = [];

  public async runAllTests() {
    console.log("Starting Harita Frontend Certification Audit...\n");
    
    await this.testReadinessConsistency();
    await this.testIntentRouting();
    await this.testReviewCriteria();
    await this.testDocumentExtraction();
    
    this.printReport();
  }

  private async testReadinessConsistency() {
    // Mock Data
    const credit = { id: 'c1', credit_code: 'EDA C1', state: 'PENDING', documents_required: [1, 2] };
    const docs = [{ credit_id: 'c1', state: 'uploaded' }];
    
    const state = submissionReadinessEngine.evaluateCredit(credit, docs);
    
    const passed = !state.readyForSubmission && state.missingEvidence.length > 0;
    this.recordResult('Readiness Consistency (WS2)', passed, passed ? 100 : 0, false, state.readyForSubmission);
  }

  private async testIntentRouting() {
    try {
      intentRoutingGovernor.validateRoute('Why was this mapped?', QuestionType.FILE_MAPPING_EXPLANATION, 'ExplanationEngine', 0.9);
      this.recordResult('Intent Routing (WS9)', true, 100, 'ExplanationEngine', 'ExplanationEngine');
    } catch (err: any) {
      this.recordResult('Intent Routing (WS9)', false, 0, 'ExplanationEngine', 'Threw Error', err.message);
    }
  }

  private async testReviewCriteria() {
    const raw = [{ criteria_text: 'Must use low VOC' }];
    const validation = ReviewCriteriaValidator.validate('IE C1', raw);
    
    const passed = validation.creditHasCriteria && validation.criteriaCount === 1;
    this.recordResult('Review Criteria (WS4)', passed, passed ? 100 : 0, true, validation.creditHasCriteria);
  }

  private async testDocumentExtraction() {
    const rawContent = 'The Carpet Area is 523 sqm and the circulation percentage is 11.6%.';
    const evidence = await DocumentEvidenceExtractor.extractEvidence('test.pdf', 'pdf', rawContent);
    
    const passed = evidence.metrics['Carpet Area'] === '523 sqm';
    this.recordResult('Document Extraction (WS5)', passed, passed ? 100 : 0, '523 sqm', evidence.metrics['Carpet Area']);
  }

  private recordResult(suite: string, passed: boolean, score: number, expected: any, actual: any, error?: string) {
    this.results.push({ suite, passed, score, expected, actual, error });
  }

  private printReport() {
    console.log("==========================================");
    console.log("      HARITA CERTIFICATION REPORT         ");
    console.log("==========================================");
    
    let totalScore = 0;
    this.results.forEach(r => {
      console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.suite}`);
      if (!r.passed) {
        console.log(`  Expected: ${r.expected} | Actual: ${r.actual}`);
        if (r.error) console.log(`  Error: ${r.error}`);
      }
      totalScore += r.score;
    });

    const finalScore = Math.round(totalScore / this.results.length);
    console.log("==========================================");
    console.log(`FINAL SCORE: ${finalScore} / 100`);
    if (finalScore >= 90) {
      console.log("STATUS: PASSED REMEDIATION");
    } else {
      console.log("STATUS: FAILED REMEDIATION");
    }
    console.log("==========================================");
  }
}

if (require.main === module) {
  new FrontendCertificationSuite().runAllTests();
}
