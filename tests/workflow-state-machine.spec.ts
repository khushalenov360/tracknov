import { expect, test } from "@playwright/test";
import { CreditWorkflowMachine, DocumentWorkflowMachine, ProjectWorkflowMachine } from "@/lib/workflow/machines";
import { validateCreditCanClose, validateProjectCanComplete } from "@/lib/workflow/validators";

test.describe("workflow state machine", () => {
  test("allows valid project transition for admin", () => {
    const machine = new ProjectWorkflowMachine();
    expect(machine.validate("active", "completed", "admin")).toBe(true);
  });

  test("rejects invalid project transition", () => {
    const machine = new ProjectWorkflowMachine();
    expect(() => machine.validate("draft", "completed", "admin")).toThrow();
  });

  test("rejects unauthorized document approval", () => {
    const machine = new DocumentWorkflowMachine();
    expect(() => machine.validate("under_review", "approved", "consultant")).toThrow();
  });

  test("allows reviewer to reject submitted document", () => {
    const machine = new DocumentWorkflowMachine();
    expect(machine.validate("submitted", "rejected", "reviewer")).toBe(true);
  });

  test("rejects invalid credit transition", () => {
    const machine = new CreditWorkflowMachine();
    expect(() => machine.validate("assigned", "approved", "admin")).toThrow();
  });

  test("blocks credit close when linked docs are not approved", () => {
    expect(() => validateCreditCanClose({ linkedDocumentsApproved: false })).toThrow();
  });

  test("blocks project completion when credits are open", () => {
    expect(() => validateProjectCanComplete({ allCreditsClosed: false })).toThrow();
  });
});
