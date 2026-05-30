import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test.describe("workflow UI authority contract", () => {
  test("central workflow state renderer defines lock and allowed-action contract", () => {
    const renderer = read("lib/workflow/state-renderer.ts");

    expect(renderer).toContain("workflowStateRenderer");
    expect(renderer).toMatch(/SUBMITTED:[\s\S]*locked:\s*true/i);
    expect(renderer).toMatch(/UNDER_REVIEW:[\s\S]*lockMode:\s*"read_only"/i);
    expect(renderer).toMatch(/APPROVED:[\s\S]*lockMode:\s*"immutable"/i);
    expect(renderer).toMatch(/CLARIFICATION:[\s\S]*editAllowed:\s*true/i);
    expect(renderer).toMatch(/allowedActions:\s*\["approve",\s*"request_clarification",\s*"reject"\]/i);
  });

  test("review queue renders backend-owned state panel and does not expose bulk approval controls", () => {
    const page = read("app/review-queue/page.tsx");

    expect(page).toContain("WorkflowStatePanel");
    expect(page).toContain("workflowStateRenderer");
    expect(page).not.toContain("Approve Selected");
    expect(page).not.toContain("Approve All Listed");
    expect(page).not.toContain("bulkReviewDocumentsAction");
  });

  test("UX handoff artifact is available for QA traceability", () => {
    const artifact = read("artifacts/handoff/2/UX_UI_DEVELOPER_HANDOFF.md");

    expect(artifact).toContain("workflowStateRenderer()");
    expect(artifact).toContain("allowed_actions");
    expect(artifact).toContain("Submittal");
  });

  test("operational roles do not see runtime repair/desync controls", () => {
    const dashboard = read("app/dashboard/page.tsx");
    const data = read("lib/data.ts");
    const reconcileRoute = read("app/api/jobs/runtime/reconcile/route.ts");

    expect(dashboard).toContain('["super_user", "super_admin"].includes(activeRole)');
    expect(dashboard).not.toContain('["super_user", "super_admin", "project_admin"].includes(activeRole)');
    expect(data).toContain('["super_user", "super_admin"].includes(user.role)');
    expect(reconcileRoute).toContain('["super_user", "super_admin"].includes(user.role)');
  });

  test("credit context screen does not execute review transitions directly", () => {
    const projectPage = read("app/projects/[id]/page.tsx");

    expect(projectPage).not.toContain("setDocumentStatusAction");
    expect(projectPage).toContain("Open review queue");
    expect(projectPage).toContain("credit screen remains context-only");
  });

  test("submittal detail screen contains required review sections", () => {
    const submittalPage = read("app/projects/[id]/submittals/[submittalId]/page.tsx");

    for (const text of [
      "WorkflowStatePanel",
      "Document viewer",
      "Validation panel",
      "Version history",
      "Review action bar",
      "Audit timeline",
      "AI assistance panel",
    ]) {
      expect(submittalPage).toContain(text);
    }
  });

  test("required backend API families exist", () => {
    for (const route of [
      "app/api/workflow/transition/route.ts",
      "app/api/validation/submittal/route.ts",
      "app/api/documents/[id]/route.ts",
      "app/api/projects/[id]/summary/route.ts",
      "app/api/credits/route.ts",
    ]) {
      expect(fs.existsSync(path.join(root, route))).toBeTruthy();
    }
  });

  test("review action server path auto-dequeues to the next project item", () => {
    const actions = read("app/actions.ts");

    expect(actions).toContain("submitDocumentTransitionAction");
    expect(actions).toContain(".neq(\"id\", currentDocumentId)");
    expect(actions).toContain("redirect(`/projects/${projectId}/submittals/${next.submittal_id ?? next.id}`)");
  });
});
