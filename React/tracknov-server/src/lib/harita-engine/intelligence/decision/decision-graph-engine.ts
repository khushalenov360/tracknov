export interface DecisionNode {
  entityId: string;
  type: 'credit' | 'evidence' | 'task' | 'contributor';
  impact: number;
  dependencies: string[];
  owners: string[];
}

export interface CreditNode {
  id: string;
  code: string;
  certificationImpact: number; // e.g. points
  dependsOn: string[]; // credit ids
  blocks: string[]; // credit ids
  owners: string[]; // roles or user ids
}

export interface EvidenceNode {
  id: string;
  type: string;
  satisfies: string; // credit id
  owners: string[];
}

export interface TaskNode {
  id: string;
  description: string;
  advances: string; // credit id or evidence id
  owners: string[];
}

export class DecisionGraphEngine {
  private credits: Map<string, CreditNode> = new Map();
  private evidence: Map<string, EvidenceNode> = new Map();
  private tasks: Map<string, TaskNode> = new Map();

  public addCredit(credit: CreditNode) {
    this.credits.set(credit.id, credit);
  }

  public addEvidence(evidence: EvidenceNode) {
    this.evidence.set(evidence.id, evidence);
  }

  public addTask(task: TaskNode) {
    this.tasks.set(task.id, task);
  }

  /**
   * Calculates the full graph impact for all nodes.
   * Does not depend on uploaded documents.
   */
  public evaluateGraph(): DecisionNode[] {
    const nodes: DecisionNode[] = [];

    // Evaluate credits
    for (const credit of this.credits.values()) {
      // Impact is its own points + impact of credits it blocks
      let impact = credit.certificationImpact;
      impact += this.calculateBlockingImpact(credit.id, new Set());

      nodes.push({
        entityId: credit.id,
        type: 'credit',
        impact: impact,
        dependencies: credit.dependsOn,
        owners: credit.owners
      });
    }

    // Evaluate evidence
    for (const ev of this.evidence.values()) {
      const parentCredit = this.credits.get(ev.satisfies);
      const impact = parentCredit ? (parentCredit.certificationImpact * 0.8) : 0; // arbitrary heuristic for evidence
      nodes.push({
        entityId: ev.id,
        type: 'evidence',
        impact: impact,
        dependencies: [ev.satisfies],
        owners: ev.owners
      });
    }

    // Evaluate tasks
    for (const task of this.tasks.values()) {
      const parentCredit = this.credits.get(task.advances);
      const impact = parentCredit ? (parentCredit.certificationImpact * 0.5) : 0; // arbitrary heuristic for task
      nodes.push({
        entityId: task.id,
        type: 'task',
        impact: impact,
        dependencies: [task.advances],
        owners: task.owners
      });
    }

    return nodes.sort((a, b) => b.impact - a.impact);
  }

  private calculateBlockingImpact(creditId: string, visited: Set<string>): number {
    if (visited.has(creditId)) return 0;
    visited.add(creditId);

    const credit = this.credits.get(creditId);
    if (!credit || !credit.blocks || credit.blocks.length === 0) return 0;

    let blockedImpact = 0;
    for (const blockedId of credit.blocks) {
      const blockedCredit = this.credits.get(blockedId);
      if (blockedCredit) {
        blockedImpact += blockedCredit.certificationImpact;
        blockedImpact += this.calculateBlockingImpact(blockedId, visited);
      }
    }
    return blockedImpact;
  }

  public getHighestImpactNode(type?: 'credit' | 'evidence' | 'task' | 'contributor'): DecisionNode | null {
    const nodes = this.evaluateGraph();
    if (type) {
      return nodes.find(n => n.type === type) || null;
    }
    return nodes[0] || null;
  }
}
