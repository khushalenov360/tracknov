import { CertificationGapEngine } from "../intelligence/certification/certification-gap-engine";

async function runTest() {
  const mockContext = {
    credits: [
      { credit_code: "EDA C1", status: "BLOCKED", completion_pct: 30, points: 2 },
      { credit_code: "WE C1", status: "BLOCKED", completion_pct: 10, points: 4 },
      { credit_code: "MR C2", status: "APPROVED", completion_pct: 100, points: 60 }
    ]
  };

  const gap = await CertificationGapEngine.calculateCertificationGap("p1", mockContext);
  
  if (!gap.narrative.includes("Gold is already secured.")) throw new Error("Missing current position");
  if (!gap.narrative.includes("6 points remain at risk.")) throw new Error("Missing risk assessment");
  if (!gap.narrative.includes("Platinum becomes unattainable.")) throw new Error("Missing target path analysis");
  if (!gap.narrative.includes("- EDA C1")) throw new Error("Raw data leaked instead of formatted string");

  console.log("certificationGapNarrative.spec.ts: PASS");
}

runTest().catch(console.error);
