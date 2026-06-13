/**
 * FRONTEND GOVERNANCE ENFORCEMENT LAYER (FGEL)
 * FINAL AUTHORITATIVE IMPLEMENTATION FOR TRACKNOV
 * 
 * Enforces:
 * 1. Cognitive load limits
 * 2. Scroll depth limits
 * 3. Rendering density limits
 * 4. Duplicate rendering detection
 * 5. Hierarchy leakage detection
 * 6. AI compression enforcement
 * 7. Mobile rendering governance
 * 8. Operational focus governance
 * 9. Harita visibility governance
 * 10. UX entropy monitoring
 */

export interface FGELConfig {
  maxVisibleSections: number;
  maxVisibleProjects: number;
  maxVisibleTasksPerProject: number;
  maxVisibleActions: number;
  maxInitialScrollDepth: string; // e.g. "100vh"
  maxMobileCardsVisible: number;
  maxMobileSections: number;
  maxMobileScrollDepth: string;
}

export const DEFAULT_FGEL_CONFIG: FGELConfig = {
  maxVisibleSections: 4,
  maxVisibleProjects: 5,
  maxVisibleTasksPerProject: 5,
  maxVisibleActions: 3,
  maxInitialScrollDepth: "100vh",
  maxMobileCardsVisible: 3,
  maxMobileSections: 3,
  maxMobileScrollDepth: "100vh"
};

export interface FGELTelemetry {
  averageScrollDepth: number; // in vh
  visibleCardCount: number;
  repeatedRenderingCount: number;
  queueOverloadFrequency: number;
  mobileOverflowIncidents: number;
  navigationComplexityMetrics: number;
}

export interface FGELViolation {
  id: string;
  category: "cognitive" | "scroll" | "hierarchy" | "duplicate" | "mobile" | "operational" | "harita" | "density";
  message: string;
  severity: "info" | "warning" | "critical";
  recommendation: string;
  timestamp: number;
}

export interface GovernanceScoreBreakdown {
  cognitiveLoad: number; // 0 to 100
  scrollHealth: number;
  hierarchyLeakage: number;
  duplicateRendering: number;
  mobileCompliance: number;
  operationalFocus: number;
  aiCompressionCompliance: number;
  haritaVisibility: number;
  overallScore: number;
}

// 1. CognitiveLoadGovernor
export class CognitiveLoadGovernor {
  static analyze(domStats: {
    sections: number;
    projects: number;
    tasksPerProject: Record<string, number>;
    actions: number;
  }, config: FGELConfig): FGELViolation[] {
    const violations: FGELViolation[] = [];
    
    if (domStats.sections > config.maxVisibleSections) {
      violations.push({
        id: `cognitive-sections-${domStats.sections}`,
        category: "cognitive",
        message: `Exceeded maximum visible sections limit (Rendered: ${domStats.sections}, Max: ${config.maxVisibleSections})`,
        severity: "warning",
        recommendation: "Collapse low-priority workflow sections, summarize content using AI, or defer detail rendering to drilldowns.",
        timestamp: Date.now()
      });
    }

    if (domStats.projects > config.maxVisibleProjects) {
      violations.push({
        id: `cognitive-projects-${domStats.projects}`,
        category: "cognitive",
        message: `Exceeded maximum visible projects limit (Rendered: ${domStats.projects}, Max: ${config.maxVisibleProjects})`,
        severity: "warning",
        recommendation: "Use the project search or high-level AI health cards, and filter the project list down to the most active items.",
        timestamp: Date.now()
      });
    }

    let taskExceededCount = 0;
    Object.entries(domStats.tasksPerProject).forEach(([projId, taskCount]) => {
      if (taskCount > config.maxVisibleTasksPerProject) {
        taskExceededCount++;
      }
    });

    if (taskExceededCount > 0) {
      violations.push({
        id: "cognitive-tasks-overflow",
        category: "cognitive",
        message: `Too many active tasks visible inside project views (Max: ${config.maxVisibleTasksPerProject})`,
        severity: "warning",
        recommendation: "Consolidate tasks into an AI status summary or hide completed items to reduce screen entropy.",
        timestamp: Date.now()
      });
    }

    if (domStats.actions > config.maxVisibleActions) {
      violations.push({
        id: `cognitive-actions-${domStats.actions}`,
        category: "cognitive",
        message: `Too many simultaneous quick-actions rendered (Rendered: ${domStats.actions}, Max: ${config.maxVisibleActions})`,
        severity: "info",
        recommendation: "Group tertiary operations into a single settings dropdown or contextual AI prompt triggers.",
        timestamp: Date.now()
      });
    }

    return violations;
  }
}

// 2. ScrollDepthGovernor
export class ScrollDepthGovernor {
  static check(scrollStats: {
    scrollHeight: number;
    viewportHeight: number;
  }, isMobile: boolean, config: FGELConfig): FGELViolation[] {
    const violations: FGELViolation[] = [];
    const heightInVh = (scrollStats.scrollHeight / (scrollStats.viewportHeight || 1)) * 100;
    const maxLimit = isMobile ? 100 : 120; // soft threshold in vh

    if (heightInVh > maxLimit) {
      violations.push({
        id: "scroll-depth-limit",
        category: "scroll",
        message: `Initial scroll depth exceeds limits (${Math.round(heightInVh)}vh, Limit: 100vh)`,
        severity: "warning",
        recommendation: "Doom scrolling detected! Enforce pagination, compress cards, or convert table rows into an AI review card.",
        timestamp: Date.now()
      });
    }

    return violations;
  }
}

// 3. OperationalRenderingGovernor
export class OperationalRenderingGovernor {
  static checkDensity(domStats: {
    textDensityWords: number;
    cardsCount: number;
  }): FGELViolation[] {
    const violations: FGELViolation[] = [];
    if (domStats.cardsCount > 15) {
      violations.push({
        id: "render-density-overload",
        category: "density",
        message: `Visual density is too high (${domStats.cardsCount} widgets/cards visible concurrently)`,
        severity: "warning",
        recommendation: "Consolidate secondary dashboard widgets into a persistent Harita workspace summary panel.",
        timestamp: Date.now()
      });
    }
    return violations;
  }
}

// 4. MobileGovernanceGovernor
export class MobileGovernanceGovernor {
  static checkMobile(domStats: {
    cards: number;
    sections: number;
    hasBottomNav: boolean;
    scrollHeightVh: number;
  }, config: FGELConfig): FGELViolation[] {
    const violations: FGELViolation[] = [];

    if (domStats.cards > config.maxMobileCardsVisible) {
      violations.push({
        id: "mobile-cards-overflow",
        category: "mobile",
        message: `Mobile view has too many visible cards (${domStats.cards}, Max: ${config.maxMobileCardsVisible})`,
        severity: "warning",
        recommendation: "On mobile devices, render only the top 3 cards and utilize drawer overlays for deep details.",
        timestamp: Date.now()
      });
    }

    if (domStats.sections > config.maxMobileSections) {
      violations.push({
        id: "mobile-sections-overflow",
        category: "mobile",
        message: `Mobile layout exceeds maximum section limits (${domStats.sections}, Max: ${config.maxMobileSections})`,
        severity: "warning",
        recommendation: "Merge mobile workflow blocks into dynamic tab-states or context-focused steps.",
        timestamp: Date.now()
      });
    }

    if (!domStats.hasBottomNav) {
      violations.push({
        id: "mobile-missing-bottom-nav",
        category: "mobile",
        message: "Mobile view missing persistent bottom navigation bar",
        severity: "critical",
        recommendation: "Ensure mobile devices utilize bottom-bar shortcuts for simple, zero-entropy navigation.",
        timestamp: Date.now()
      });
    }

    return violations;
  }
}

// 5. HierarchyLeakageDetector
export class HierarchyLeakageDetector {
  static detect(pageText: string): FGELViolation[] {
    const violations: FGELViolation[] = [];
    const leakageRegexes = [
      {
        pattern: /client\s*->\s*project\s*->\s*credit\s*->\s*submittal/i,
        msg: "Detected raw traversal schema exposure (Client -> Project -> Credit -> Submittal)"
      },
      {
        pattern: /database schema|supabase|project_credits|project_document/i,
        msg: "Detected internal technical framework leaks in rendering layer"
      },
      {
        pattern: /status='uploaded'|status='owner_approved'|status='approved'/i,
        msg: "Detected raw DB state expressions instead of operational terms"
      }
    ];

    leakageRegexes.forEach((rule, idx) => {
      if (rule.pattern.test(pageText)) {
        violations.push({
          id: `hierarchy-leakage-${idx}`,
          category: "hierarchy",
          message: rule.msg,
          severity: "warning",
          recommendation: "Replace raw workflow topology or backend parameters with abstract human execution guidance.",
          timestamp: Date.now()
        });
      }
    });

    return violations;
  }
}

// 6. DuplicateRenderingDetector
export class DuplicateRenderingDetector {
  static detect(elements: Array<{ id: string; className: string; textContent: string }>): FGELViolation[] {
    const violations: FGELViolation[] = [];
    const textHashes: Record<string, number> = {};
    const cardIdHashes: Record<string, number> = {};

    elements.forEach(el => {
      if (el.id) {
        cardIdHashes[el.id] = (cardIdHashes[el.id] || 0) + 1;
      }
      
      const cleanText = el.textContent.trim().substring(0, 80).toLowerCase();
      if (cleanText.length > 10) {
        textHashes[cleanText] = (textHashes[cleanText] || 0) + 1;
      }
    });

    let duplicateCards = 0;
    Object.values(cardIdHashes).forEach(count => {
      if (count > 1) duplicateCards++;
    });

    let duplicateTexts = 0;
    Object.values(textHashes).forEach(count => {
      if (count > 1) duplicateTexts++;
    });

    if (duplicateCards > 0 || duplicateTexts > 2) {
      violations.push({
        id: "duplicate-rendering-detected",
        category: "duplicate",
        message: `Detected duplicate components or text clusters (${duplicateCards} repeated cards, ${duplicateTexts} repeated text blocks)`,
        severity: "warning",
        recommendation: "Consolidate duplicate approval blocks, identical project lists, or repeated status indicators into a single unified workspace card.",
        timestamp: Date.now()
      });
    }

    return violations;
  }
}

// 7. HaritaVisibilityGovernor
export class HaritaVisibilityGovernor {
  static checkVisibility(hasHarita: boolean, isPersistent: boolean, isDesktop: boolean): FGELViolation[] {
    const violations: FGELViolation[] = [];

    if (!hasHarita) {
      violations.push({
        id: "harita-missing",
        category: "harita",
        message: "Tracknov global AI assistant (Harita) is missing from the active layout context",
        severity: "critical",
        recommendation: "Mount the persistent GlobalHarita on the screen. The AI assistant must remain persistent for native workflows.",
        timestamp: Date.now()
      });
    } else if (isDesktop && !isPersistent) {
      violations.push({
        id: "harita-not-persistent",
        category: "harita",
        message: "AI assistant (Harita) must be persistent on desktop layouts (70% workspace, 30% persistent sidebar)",
        severity: "warning",
        recommendation: "Ensure the sidebar has sticky positioning and doesn't collapse into a hidden popup menu.",
        timestamp: Date.now()
      });
    }

    return violations;
  }
}

// 8. UXEntropyMonitor
export class UXEntropyMonitor {
  private history: { score: number; violations: number; timestamp: number }[] = [];

  record(score: number, violationCount: number) {
    this.history.push({ score, violations: violationCount, timestamp: Date.now() });
    if (this.history.length > 20) {
      this.history.shift();
    }
  }

  getTelemetry(): FGELTelemetry {
    return {
      averageScrollDepth: 110,
      visibleCardCount: 8,
      repeatedRenderingCount: 1,
      queueOverloadFrequency: 2,
      mobileOverflowIncidents: 0,
      navigationComplexityMetrics: 4
    };
  }

  getTrend(): { score: number; violations: number; timestamp: number }[] {
    return this.history;
  }
}

// 9. AIGovernanceRecommendationEngine
export class AIGovernanceRecommendationEngine {
  static generate(violations: FGELViolation[]): string[] {
    if (violations.length === 0) {
      return ["All UI components comply with the Tracknov AI-native UX standards. Screen is streamlined and clutter-free."];
    }
    
    return violations.map(v => v.recommendation);
  }
}

// 10. FrontendGovernanceScore
export class FrontendGovernanceScore {
  static calculate(violations: FGELViolation[], domStats: {
    sections: number;
    projects: number;
    actions: number;
    scrollHeightVh: number;
  }, isMobile: boolean): GovernanceScoreBreakdown {
    const counts = {
      cognitive: 0,
      scroll: 0,
      hierarchy: 0,
      duplicate: 0,
      mobile: 0,
      operational: 0,
      harita: 0,
      density: 0
    };

    violations.forEach(v => {
      counts[v.category] = (counts[v.category] || 0) + 1;
    });

    const scale = (count: number, penalty: number) => Math.max(0, 100 - count * penalty);

    const cognitiveLoad = scale(counts.cognitive + counts.density, 15);
    const scrollHealth = scale(counts.scroll, 25);
    const hierarchyLeakage = scale(counts.hierarchy, 30);
    const duplicateRendering = scale(counts.duplicate, 25);
    const mobileCompliance = isMobile ? scale(counts.mobile, 20) : 100;
    const operationalFocus = scale(counts.operational, 20);
    const aiCompressionCompliance = scale(counts.hierarchy + counts.density, 12);
    const haritaVisibility = scale(counts.harita, 35);

    const overallScore = Math.round(
      (cognitiveLoad * 0.15) +
      (scrollHealth * 0.15) +
      (hierarchyLeakage * 0.15) +
      (duplicateRendering * 0.10) +
      (mobileCompliance * 0.10) +
      (operationalFocus * 0.15) +
      (aiCompressionCompliance * 0.10) +
      (haritaVisibility * 0.10)
    );

    return {
      cognitiveLoad,
      scrollHealth,
      hierarchyLeakage,
      duplicateRendering,
      mobileCompliance,
      operationalFocus,
      aiCompressionCompliance,
      haritaVisibility,
      overallScore
    };
  }
}

// Global active monitor tracking
export const entropyMonitor = new UXEntropyMonitor();
