import {
  ProjectCertificationMachine,
  SubmittalWorkflowMachine,
  CreditWorkflowMachine,
} from "./machines";

/**
 * 05_WORKFLOW_BASELINE
 * 
 * Central registry of all authoritative state machines.
 * All state mutations and validations MUST route through this catalog.
 */
export const WorkflowCatalog = {
  project: new ProjectCertificationMachine(),
  submittal: new SubmittalWorkflowMachine(),
  credit: new CreditWorkflowMachine(),
};

export type WorkflowRegistry = typeof WorkflowCatalog;
