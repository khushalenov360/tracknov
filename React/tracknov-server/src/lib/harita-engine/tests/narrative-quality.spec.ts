import { describe, it, expect } from 'vitest';
import { IgbcNarrativeEngine } from '../intelligence/narrative/igbc-narrative-engine';

describe('Narrative Quality Engine', () => {
  it('should generate an IGBC structured narrative', () => {
    const inputs = {
      creditRequirements: "Provide 15% energy efficiency",
      reviewCriteria: "Show energy modeling report",
      uploadedEvidence: ["energy-model.pdf"],
      projectContext: "Office building in Indore"
    };

    const narrative = IgbcNarrativeEngine.generateNarrative(inputs);
    expect(narrative).toHaveProperty('intent');
    expect(narrative).toHaveProperty('projectCompliance');
    expect(narrative).toHaveProperty('evidenceSummary');
    expect(narrative).toHaveProperty('designStrategy');
    expect(narrative).toHaveProperty('conclusion');
  });

  it('should throw error if evidence is missing', () => {
    expect(() => {
      IgbcNarrativeEngine.generateNarrative({
        creditRequirements: "Provide 15% energy efficiency",
        reviewCriteria: "Show energy modeling report",
        uploadedEvidence: [],
        projectContext: "Office building in Indore"
      });
    }).toThrow();
  });
});
