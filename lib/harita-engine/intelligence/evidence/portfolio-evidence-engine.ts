export interface EvidenceGap {
  creditId: string;
  creditCode: string;
  missingDocuments: string[];
  rejectedDocuments: string[];
  readinessImpact: number;
}

export class PortfolioEvidenceEngine {
  public static async getEvidenceGaps(projectId: string, runtimeContext: any): Promise<EvidenceGap[]> {
    const gaps: EvidenceGap[] = [];
    const credits = runtimeContext.credits || [];
    const documents = runtimeContext.documents || [];

    for (const credit of credits) {
      if (credit.status === "APPROVED" || credit.na) continue;
      
      const missingDocuments: string[] = [];
      const rejectedDocuments: string[] = [];
      
      const creditDocs = documents.filter((d: any) => d.doc_category === credit.credit_code);
      
      for (const doc of creditDocs) {
        if (doc.state === "REJECTED") {
          rejectedDocuments.push(doc.file_name || doc.id);
        }
      }
      
      // Look at assignments to see what's missing
      const creditMap = runtimeContext.creditAssignmentGraph instanceof Map 
        ? runtimeContext.creditAssignmentGraph 
        : new Map(Object.entries(runtimeContext.creditAssignmentGraph || {}));
      
      const node = creditMap.get(credit.id);
      if (node && (node as any).assignments) {
        for (const assign of (node as any).assignments) {
          // If we have an assignment for a doc type, check if a document exists for it
          // Simplified heuristic for missing documents:
          const hasDoc = creditDocs.some((d: any) => d.doc_type === assign.doc_type || d.file_name?.includes(assign.doc_type));
          if (!hasDoc) {
             missingDocuments.push(assign.doc_type);
          }
        }
      }

      if (missingDocuments.length > 0 || rejectedDocuments.length > 0) {
        // High readiness impact if there are rejections
        const readinessImpact = rejectedDocuments.length > 0 ? 80 : 40;
        
        gaps.push({
          creditId: credit.id,
          creditCode: credit.credit_code,
          missingDocuments,
          rejectedDocuments,
          readinessImpact
        });
      }
    }

    return gaps.sort((a, b) => b.readinessImpact - a.readinessImpact);
  }
}
