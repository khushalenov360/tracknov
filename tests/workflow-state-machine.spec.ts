import { expect, test } from "@playwright/test";
import { CreditWorkflowMachine, DocumentWorkflowMachine, ProjectWorkflowMachine, mapTracknovRoleToWorkflowRole } from "@/lib/workflow/machines";
import { validateCreditCanClose, validateProjectCanComplete } from "@/lib/workflow/validators";

test.describe("workflow state machine", () => {
  test("allows valid project transition for project_admin (admin role)", () => {
    const machine = new ProjectWorkflowMachine();
    const role = mapTracknovRoleToWorkflowRole("project_admin");
    expect(machine.validate("active", "completed", role)).toBe(true);
  });

  test("rejects invalid project transition", () => {
    const machine = new ProjectWorkflowMachine();
    const role = mapTracknovRoleToWorkflowRole("project_admin");
    expect(() => machine.validate("draft", "completed", role)).toThrow();
  });

  test("rejects unauthorized document approval for consultant", () => {
    const machine = new DocumentWorkflowMachine();
    const role = mapTracknovRoleToWorkflowRole("consultant");
    expect(() => machine.validate("under_review", "approved", role)).toThrow();
  });

  test("allows owner (reviewer role) to reject submitted document", () => {
    const machine = new DocumentWorkflowMachine();
    const role = mapTracknovRoleToWorkflowRole("owner");
    expect(machine.validate("submitted", "rejected", role)).toBe(true);
  });

  test("rejects invalid credit transition for project_admin", () => {
    const machine = new CreditWorkflowMachine();
    const role = mapTracknovRoleToWorkflowRole("project_admin");
    expect(() => machine.validate("assigned", "approved", role)).toThrow();
  });

  test("blocks credit close when linked docs are not approved", () => {
    expect(() => validateCreditCanClose({ linkedDocumentsApproved: false })).toThrow();
  });

  test("blocks project completion when credits are open", () => {
    expect(() => validateProjectCanComplete({ allCreditsClosed: false })).toThrow();
  });

  test("allows project_admin to eliminate document after rejection", () => {
    const machine = new DocumentWorkflowMachine();
    const role = mapTracknovRoleToWorkflowRole("project_admin");
    expect(machine.validate("rejected", "eliminated", role)).toBe(true);
  });
});
