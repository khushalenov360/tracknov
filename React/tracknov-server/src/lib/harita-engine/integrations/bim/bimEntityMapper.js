"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BimEntityMapper = void 0;
class BimEntityMapper {
    /**
     * Translates extracted model components into specific documentation candidates
     */
    static mapEntitiesToCredits(elements) {
        return elements.map((elem) => {
            let targetCreditCode = "MR-C2"; // Recycled Materials
            let evidenceCandidateName = "Recycled_Steel_Mill_Certificate.pdf";
            let matchScore = 0.95;
            if (elem.className.includes("HVAC") || elem.className.includes("Air")) {
                targetCreditCode = "E-C1"; // Energy Performance
                evidenceCandidateName = "HVAC_Commissioning_Report.pdf";
                matchScore = 0.98;
            }
            else if (elem.className.includes("Lighting") || elem.className.includes("Fixture")) {
                targetCreditCode = "IAQ-C3"; // Low-VOC or Electrical Load
                evidenceCandidateName = "Lighting_Load_Calculations.pdf";
                matchScore = 0.88;
            }
            return {
                bimElementId: elem.id,
                elementClass: elem.className,
                targetCreditCode,
                matchScore,
                evidenceCandidateName
            };
        });
    }
}
exports.BimEntityMapper = BimEntityMapper;
