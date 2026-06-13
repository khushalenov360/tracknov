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
exports.frontendTrustCertificationScenarios = void 0;
const test_1 = require("@playwright/test");
// This is a placeholder test suite outline for the Frontend Trust Certification.
// These tests would be run by the Playwright or Jest test runner in the CI/CD pipeline.
exports.frontendTrustCertificationScenarios = [
    {
        name: "Context Isolation",
        description: "Upload -> Discard -> Narrative",
        validate: (haritaMock) => __awaiter(void 0, void 0, void 0, function* () {
            yield haritaMock.send("Upload layout.pdf");
            yield haritaMock.send("Discard layout.pdf");
            const response = yield haritaMock.send("Draft narrative for EDA C1");
            (0, test_1.expect)(response).not.toContain("layout.pdf");
        })
    },
    {
        name: "Traceability",
        description: "Narrative -> Source query",
        validate: (haritaMock) => __awaiter(void 0, void 0, void 0, function* () {
            yield haritaMock.send("Draft narrative for EDA C1");
            const response = yield haritaMock.send("Which documents did you use?");
            (0, test_1.expect)(response).toContain("Answer:");
            (0, test_1.expect)(response).toContain("Source:");
        })
    },
    {
        name: "Routing",
        description: "Mapping explanation",
        validate: (haritaMock) => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield haritaMock.send("Why did you map this file to EDA C1?");
            (0, test_1.expect)(response).not.toContain("Confirm upload");
            (0, test_1.expect)(response).toContain("Reasoning:");
        })
    },
    {
        name: "Readiness",
        description: "Can EDA C1 be submitted?",
        validate: (haritaMock) => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield haritaMock.send("Can EDA C1 be submitted today?");
            (0, test_1.expect)(response).toContain("Answer:");
            (0, test_1.expect)(response).toContain("Reasoning:");
            (0, test_1.expect)(response).toContain("Recommended Action:");
        })
    },
    {
        name: "Evidence",
        description: "What evidence supports this?",
        validate: (haritaMock) => __awaiter(void 0, void 0, void 0, function* () {
            yield haritaMock.send("EDA C1 is blocked.");
            const response = yield haritaMock.send("What evidence supports this?");
            (0, test_1.expect)(response).toContain("Evidence:");
            (0, test_1.expect)(response).toContain("Source:");
        })
    }
];
