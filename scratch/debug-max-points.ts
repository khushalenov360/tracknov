import './load-env';
import { assembleRuntimeContext } from '../lib/harita-engine/lib/runtime/runtime-context-assembler';

const projectId = '1fabd316-6d0f-4de3-a149-7e23c528aab9';
const mockUser = {
  id: '81e20209-8a9b-4922-a319-989a4891e4eb',
  email: 'khush@enov360.com',
  user_metadata: {
    role: 'super_admin'
  }
};

async function run() {
  const runtimeCtx = await assembleRuntimeContext(projectId, mockUser);
  if (!runtimeCtx) {
    console.error("Failed to assemble context");
    return;
  }
  
  console.log("Number of credits assembled:", runtimeCtx.credits.length);
  const creditsWithPoints = runtimeCtx.credits.map(c => ({
    code: c.credit_code,
    max_points: (c as any).max_points,
    available_points: (c as any).available_points
  }));
  
  console.log("First 10 credits:");
  console.log(creditsWithPoints.slice(0, 10));
  
  const sumMaxPoints = runtimeCtx.credits.reduce((sum, c) => sum + Number((c as any).max_points ?? 0), 0);
  console.log("Sum of max_points in assembled credits:", sumMaxPoints);
  
  // Let's also check what the CertificationStrategyEngine gets
  const { certificationStrategyEngine } = await import('../lib/harita-engine/services/certification-strategy-engine');
  const strategy = certificationStrategyEngine.getStrategy(runtimeCtx.credits);
  console.log("Strategy details:");
  console.log("currentScore:", strategy.currentScore);
  console.log("totalAvailable:", strategy.totalAvailable);
}

run().catch(console.error);
