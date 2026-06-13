"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowCatalog = void 0;
const machines_1 = require("./machines");
/**
 * 05_WORKFLOW_BASELINE
 *
 * Central registry of all authoritative state machines.
 * All state mutations and validations MUST route through this catalog.
 */
exports.WorkflowCatalog = {
    project: new machines_1.ProjectCertificationMachine(),
    submittal: new machines_1.SubmittalWorkflowMachine(),
    credit: new machines_1.CreditWorkflowMachine(),
};
