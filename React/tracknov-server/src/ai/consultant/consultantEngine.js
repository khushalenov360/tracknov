"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultantEngine = void 0;
const projectReasoner_1 = require("./projectReasoner");
const creditReasoner_1 = require("./creditReasoner");
const evidenceReasoner_1 = require("./evidenceReasoner");
const readinessReasoner_1 = require("./readinessReasoner");
const clarificationReasoner_1 = require("./clarificationReasoner");
class ConsultantEngine {
    constructor(graph) {
        this.graph = graph;
        this.projectReasoner = new projectReasoner_1.ProjectReasoner(graph);
        this.creditReasoner = new creditReasoner_1.CreditReasoner(graph);
        this.evidenceReasoner = new evidenceReasoner_1.EvidenceReasoner(graph);
        this.readinessReasoner = new readinessReasoner_1.ReadinessReasoner(graph);
        this.clarificationReasoner = new clarificationReasoner_1.ClarificationReasoner(graph);
    }
    evaluateProjectHealth(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.projectReasoner.evaluate(projectId);
        });
    }
    evaluateCredit(creditId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.creditReasoner.evaluate(creditId);
        });
    }
}
exports.ConsultantEngine = ConsultantEngine;
