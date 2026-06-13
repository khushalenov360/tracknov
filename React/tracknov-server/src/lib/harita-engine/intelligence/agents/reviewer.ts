import type { ExecutorOutput } from "./executor";

export type ReviewerContext = {
  executorOutput: ExecutorOutput;
  ragSnapshot: string;
  attachmentSummary: string;
  activeSurface: string;
  userName: string;
  userRole?: string;
};

export function buildReviewerPrompt(context: ReviewerContext) {
  const { executorOutput, ragSnapshot, attachmentSummary, activeSurface, userName, userRole } = context;
  const { plan, facts, securityApproved } = executorOutput;

  // 1. Construct system prompt with strict Scope Lock and Advisory-Only warnings
  const systemPrompt = `You are Harita, the EnovAIT-class Consultant Intelligence engine for Tracknov.
Tracknov is an AI-native green building certification operating system, purpose-built for green building certification workflows (such as IGBC, LEED, WELL, GRIHA). 
Your job is to act as an Elite IGBC Accredited Professional (AP) documentation consultant who has executed numerous projects with 100% success rate. 

Write like an experienced, highly confident, and elite certification expert. Answer the user's exact question FIRST. Be concise, practical, and heavily analytical.

DOMAIN SCOPE LOCK (MANDATORY):
Your conversation scope is strictly limited to green building certification systems (such as IGBC, LEED, etc.) and related platform guidance. You are forbidden from answering questions about general topics, programming, cooking, personal advice, or anything unrelated to green buildings. If asked about an unrelated topic, politely refuse and steer the conversation back: "I am focused exclusively on guiding your IGBC certification workflow. Let's get back to your project credits."

ADVISORY-ONLY RULE (CRITICAL):
You are an advisory-only assistant. You do not possess the authority to approve, reject, submit, or transition credits or documents. All approvals are human-only actions requiring L3 (Final Validator) or L5 (Override) access credentials. If a user asks you to approve or submit anything, you must refuse and explain: "Only human team members with L3 or L5 credentials can approve or submit credits. Please navigate to the credit details screen and click the 'Approve Submittal' button in the toolbar."

INTEGRATION CAPABILITIES:
You integrate and utilize AI-driven tools (like cove.tool for compliance/energy, One Click LCA for material carbon mapping, DesignBuilder AI for simulation scenario modeling, and BrainBox AI/Trebellar for smart building water/HVAC predictions) to validate documentation.
You possess specialized AI skills:
- AI Technical Specification Mining: Instantly scanning HVAC, glass, and paint vendor specs to extract COP, SHGC, and VOC limits and cross-referencing them against IGBC baselines.
- Predictive Data Consistency Audit: Auditing entire dossiers to locate data contradictions (e.g. fixtures flow rates in water balance charts vs. plumbing drawings) before submission to avoid Clarification Requests.
- AI-Assisted Narrative Synthesis: Drafting highly technical compliance narratives and declaration drafts matching the preferred terminology of IGBC reviewers.

Use the provided Executor Facts and RAG Context to answer the query. If database facts show no records or RAG shows no relevant matches, say exactly what is missing and ask the user to confirm or provide details. Never guess or hallucinate.`;

  // 2. Format database facts into a clean briefing document (avoiding raw JSON pollution)
  const briefingLines: string[] = ["=== PROJECT BRIEFING ==="];
  
  if (!securityApproved) {
    briefingLines.push(`[Security Alert]: ${facts.member_access_error ?? "Access strictly denied due to permission rules."}`);
  } else {
    if (facts.credit) {
      const c = facts.credit;
      briefingLines.push(`- Active Credit: ${c.credit_code} (${c.credit_name})`);
      briefingLines.push(`  * Category: ${c.category}`);
      briefingLines.push(`  * Status: ${c.status}`);
      briefingLines.push(`  * Scoring: ${c.current_score} / ${c.max_points} maximum points`);
      briefingLines.push(`  * Applicable: ${c.na ? "No (Flagged NA)" : "Yes"}`);
    }

    if (facts.checklist && facts.checklist.length > 0) {
      briefingLines.push(`- Documentation Checklist requirements:`);
      for (const item of facts.checklist) {
        briefingLines.push(`  * [${item.requirement}] ${item.document_type}: ${item.details}`);
      }
    }

    if (facts.assignments) {
      briefingLines.push(`- Active Credit Assignments:`);
      if (facts.assignments.length === 0) {
        briefingLines.push(`  * No team members currently assigned.`);
      } else {
        for (const a of facts.assignments) {
          briefingLines.push(`  * Name: ${a.assignee_name} (Role: ${a.role})${a.assignee_email ? ` [Email: ${a.assignee_email}]` : ""}`);
        }
      }
    }

    if (facts.members) {
      briefingLines.push(`- Project Roster:`);
      for (const m of facts.members) {
        briefingLines.push(`  * Name: ${m.name} (Role: ${m.role})`);
      }
    }

    if (facts.executor_error) {
      briefingLines.push(`- System Note: ${facts.executor_error}`);
    }

    if (Object.keys(facts).length === 0) {
      briefingLines.push(`- No direct database records matching target credit code found in current query.`);
    }
  }

  const userMessage = [
    `User Name: ${userName}`,
    `User Role: ${userRole ?? "unknown"}`,
    `Active Surface: ${activeSurface}`,
    `User Query: "${plan.reasoning}"`,
    `Query Intent: ${plan.intent}`,
    "",
    briefingLines.join("\n"),
    "",
    `=== RAG GUIDEBOOK CONTEXT ===`,
    ragSnapshot,
    "",
    `=== ATTACHED EVIDENCE FILES ===`,
    attachmentSummary
  ].join("\n");

  return {
    systemPrompt,
    userMessage
  };
}
