import { expect, test } from "@playwright/test";
import { ProjectCertificationMachine, SubmittalWorkflowMachine, mapTracknovRoleToWorkflowRole } from "@/lib/workflow/machines";
import { validateCreditCanClose, validateProjectCanComplete } from "@/lib/workflow/validators";

test.describe("workflow state machine", () => {
  test("allows valid project transition for project_admin (admin role is L5)", () => {
    const machine = new ProjectCertificationMachine();
    const role = mapTracknovRoleToWorkflowRole("project_admin"); // L5
    expect(machine.validate("NOT_STARTED", "IN_PROGRESS", role)).toBe(true);
  });

  test("rejects invalid project transition", () => {
    const machine = new ProjectCertificationMachine();
    const role = mapTracknovRoleToWorkflowRole("project_admin");
    expect(() => machine.validate("NOT_STARTED", "ELIGIBLE", role)).toThrow();
  });

  test("rejects unauthorized document approval for consultant (L1)", () => {
    const machine = new SubmittalWorkflowMachine();
    const role = mapTracknovRoleToWorkflowRole("consultant"); // L1
    expect(() => machine.validate("UNDER_REVIEW", "APPROVED", role)).toThrow();
  });

  test("allows project_admin (L3 reviewer role) to reject submitted/under_review document", () => {
    const machine = new SubmittalWorkflowMachine();
    const role = mapTracknovRoleToWorkflowRole("project_admin"); // L3
    expect(machine.validate("UNDER_REVIEW", "REJECTED", role)).toBe(true);
  });

  test("blocks credit close when linked docs are not approved", () => {
    expect(() => validateCreditCanClose({ linkedDocumentsApproved: false })).toThrow();
  });

  test("blocks project completion when credits are open", () => {
    expect(() => validateProjectCanComplete({ allCreditsClosed: false })).toThrow();
  });
});
