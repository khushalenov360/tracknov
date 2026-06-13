"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossProjectLearningEngine = void 0;
class CrossProjectLearningEngine {
    static getCommonEvidenceRequirements(creditCode) {
        return {
            creditCode,
            typicallyRequires: ["Area Statement", "Layout Drawings", "Circulation Calculation Sheet"],
            basedOnProjects: 73
        };
    }
}
exports.CrossProjectLearningEngine = CrossProjectLearningEngine;
