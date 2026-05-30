import { WorkflowValidationError } from "@/lib/workflow/exceptions";

export function validateCreditCanClose(args: { linkedDocumentsApproved: boolean }) {
  if (!args.linkedDocumentsApproved) {
    throw new WorkflowValidationError("Credit cannot be approved/closed until all linked documents are approved.");
  }
}

export function validateProjectCanComplete(args: { allCreditsClosed: boolean }) {
  if (!args.allCreditsClosed) {
    throw new WorkflowValidationError("Project cannot be completed until all credits are closed.");
  }
}

