import { expect, test } from "@playwright/test";
import { 
  DEFAULT_FGEL_CONFIG, 
  CognitiveLoadGovernor, 
  ScrollDepthGovernor, 
  MobileGovernanceGovernor, 
  HierarchyLeakageDetector, 
  DuplicateRenderingDetector, 
  FrontendGovernanceScore 
} from "@tracknov/harita-engine/governance/fgel";

test.describe("Frontend Governance Enforcement Layer (FGEL) Unit Tests", () => {
  
  test("CognitiveLoadGovernor flags excess sections and actions", () => {
    // 5 sections (limit is 4), 6 projects (limit is 5), 4 actions (limit is 3)
    const domStats = {
      sections: 5,
      projects: 6,
      tasksPerProject: { "proj-1": 6 }, // 6 tasks (limit is 5)
      actions: 4
    };

    const violations = CognitiveLoadGovernor.analyze(domStats, DEFAULT_FGEL_CONFIG);
    expect(violations.length).toBeGreaterThanOrEqual(3);
    
    const categories = violations.map(v => v.category);
    expect(categories).toContain("cognitive");
    
    const sectionViolation = violations.find(v => v.message.includes("sections"));
    expect(sectionViolation).toBeDefined();
    expect(sectionViolation?.severity).toBe("warning");
  });

  test("ScrollDepthGovernor flags excessive scroll heights", () => {
    const scrollStats = {
      scrollHeight: 1500,
      viewportHeight: 1000 // 150vh
    };

    const violations = ScrollDepthGovernor.check(scrollStats, false, DEFAULT_FGEL_CONFIG);
    expect(violations.length).toBe(1);
    expect(violations[0].category).toBe("scroll");
    expect(violations[0].message).toContain("scroll depth exceeds");
  });

  test("MobileGovernanceGovernor enforces mobile layout constraints", () => {
    const domStats = {
      cards: 5, // limit is 3
      sections: 4, // limit is 3
      hasBottomNav: false, // critical failure
      scrollHeightVh: 120
    };

    const violations = MobileGovernanceGovernor.checkMobile(domStats, DEFAULT_FGEL_CONFIG);
    expect(violations.length).toBe(3);
    
    const categories = violations.map(v => v.category);
    expect(categories).toContain("mobile");

    const criticalViol = violations.find(v => v.severity === "critical");
    expect(criticalViol).toBeDefined();
    expect(criticalViol?.message).toContain("bottom navigation");
  });

  test("HierarchyLeakageDetector flags client-project-credit-submittal patterns", () => {
    const badText = "The path is Client -> Project -> Credit -> Submittal, mapped inside project_credits table in Supabase";
    const violations = HierarchyLeakageDetector.detect(badText);
    expect(violations.length).toBe(2);
    
    const messages = violations.map(v => v.message);
    expect(messages.some(m => m.includes("Client -> Project"))).toBeTruthy();
    expect(messages.some(m => m.includes("technical framework leaks"))).toBeTruthy();
  });

  test("DuplicateRenderingDetector flags identical components or text", () => {
    const elements = [
      { id: "proj-1", className: "card", textContent: "Active credit EE C4 ready for submission." },
      { id: "proj-1", className: "card", textContent: "Active credit EE C4 ready for submission." }, // Repeated card ID
      { id: "proj-2", className: "card", textContent: "Verify documentation relevance and completeness." },
      { id: "proj-3", className: "card", textContent: "Verify documentation relevance and completeness." }  // Repeated text
    ];

    const violations = DuplicateRenderingDetector.detect(elements);
    expect(violations.length).toBe(1);
    expect(violations[0].category).toBe("duplicate");
    expect(violations[0].message).toContain("duplicate components");
  });

  test("FrontendGovernanceScore calculates score with appropriate weightings", () => {
    const stats = {
      sections: 3,
      projects: 3,
      actions: 2,
      scrollHeightVh: 80
    };

    // No violations -> 100%
    const perfectScore = FrontendGovernanceScore.calculate([], stats, false);
    expect(perfectScore.overallScore).toBe(100);

    // Add cognitive and scroll violations
    const violations = [
      {
        id: "v1",
        category: "cognitive" as const,
        message: "Too many sections",
        severity: "warning" as const,
        recommendation: "Collapse",
        timestamp: Date.now()
      },
      {
        id: "v2",
        category: "scroll" as const,
        message: "Excessive scroll",
        severity: "warning" as const,
        recommendation: "Paginate",
        timestamp: Date.now()
      }
    ];

    const penaltyScore = FrontendGovernanceScore.calculate(violations, stats, false);
    expect(penaltyScore.overallScore).toBeLessThan(100);
    expect(penaltyScore.overallScore).toBeGreaterThanOrEqual(50);
  });
});
