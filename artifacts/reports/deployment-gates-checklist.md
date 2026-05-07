# Deployment gates checklist automation

| Gate | Status |
|---|---:|
| Runtime desync schema present | PASS |
| AI governance migration present | PASS |
| Runtime orchestration hardening migration present | PASS |
| Workflow transition endpoint present | PASS |
| Workflow transition rules table present | PASS |
| Certified lock guard present | PASS |
| Append-only trigger baseline present | PASS |
| Runtime reconciliation endpoint present | PASS |
| Signed URL endpoint present | PASS |
| Rate-limit utility present | PASS |

## Manual derived-state mutation scan

| File | Finding |
|---|---|
| `lib/data.ts` | project derived-state update |
| `lib/services/credit-service.ts` | project_credit derived-state update |
| `lib/services/project-service.ts` | project derived-state update |
| `lib/services/project-service.ts` | project_credit derived-state update |
| `lib/services/review-service.ts` | project derived-state update |
