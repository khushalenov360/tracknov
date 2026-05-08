export type DemoStep = {
  id: string;
  title: string;
  instruction: string;
  target: string;
};

export function getDemoWalkthrough(): DemoStep[] {
  return [
    {
      id: "demo-upload",
      title: "Step 1: Upload Mapped Evidence",
      instruction: "Select project, credit, document type, then upload one file to start workflow.",
      target: "/documents",
    },
    {
      id: "demo-review",
      title: "Step 2: Run Review Flow",
      instruction: "Project Owner reviews first, then Project Admin completes final decision.",
      target: "/review-queue",
    },
    {
      id: "demo-insight",
      title: "Step 3: Read Executive Insights",
      instruction: "Open dashboard cards for risk, token runway, and submission readiness.",
      target: "/dashboard",
    },
  ];
}

export function getDemoDatasetSummary() {
  return {
    projects: 3,
    credits: 47,
    documents: 138,
    pendingReviews: 9,
    rejected: 4,
    approved: 96,
    tokenBalance: 240,
  };
}
