# Tracknov React TODO

Last updated: 2026-06-20 IST
Active source of truth: `C:\Users\91922\Desktop\New Text Document.txt`

Scope rule:
- This TODO is restricted to the React implementation only:
  - `C:\Users\91922\Documents\Codex\tracknov\React\tracknov-client`
  - `C:\Users\91922\Documents\Codex\tracknov\React\tracknov-server`
  - `C:\Users\91922\Documents\Codex\tracknov\tracknov-ai-server`
- All Next.js-path items, historical handoff ledgers, and legacy backlog sections are excluded from active execution scope.

## 1. Role Framework

- [~] Enforce the 6-tier role framework consistently across React UI, React server, AI server, and database access:
  - `L0` Contributors: Contractor, MEP Consultant, Architect
  - `L1` Project Manager
  - `L2` Client
  - `L3` Project Admin
  - `L4` Reserved enterprise scope
  - `L5` Super User

## 2. Unified Task Requirements Checklist

### Phase 1: React Migration Cleanup & Routing Core

- [x] Repair SPA navigation routing with explicit dynamic client-side routes using `react-router-dom`
- [x] Extract active project parameter using route params instead of hardcoded project routing
- [x] Replace dead Next.js server navigation assumptions in the active React shell
- [x] Implement view-switch loading skeletons for workspace surfaces
- [x] Keep Harita mounted inside a persistent React context provider across workspace route switches
- [x] Purge active-route dependence on `next/navigation` and `NEXT_PUBLIC_` prefixes in the React runtime
- [x] Replace remaining frontend-derived readiness/workflow/completion logic with backend-owned contracts only

### Phase 2: Gemini-Like UI/UX Refactor

- [x] Decommission the floating attach-evidence modal and dead target dropdown prerequisite
- [x] Direct native file attachment from the composer paperclip
- [x] Inline attachment preview anchored to the active composer
- [x] Split payload stream architecture between streamed markdown and terminal structured metadata
- [x] Shift primary navigation to queue-first surfaces: `Dashboard`, `My Queue`, `Reviews`, `Uploads`, `Documents`, `Approvals`
- [x] Implement queue-first priority order:
  - `My Priority Tasks`
  - `Mandatory Blockers`
  - `Pending Reviews`
  - `Clarifications`
  - `AI Guidance`
- [x] Implement three-pane review workspace:
  - left: queue groups
  - center: current submittal evidence + action controls
  - right: workflow context + warnings + history
- [x] Hide diagnostics/desync/reconciliation tooling from operational roles in the React UI
- [x] Restrict Project Admin React surfaces to validation queues, blockers, stage readiness, pending reviews, and workflow actions
- [x] Add workflow conflict UX handling for governed review actions

### Phase 3: Backend Engine & Confidence Gating

- [x] Decommission static local markdown parsing fallback for active guidebook retrieval paths in cloud mode
- [x] Build State 1: Discovery Mode for attachment analysis without locked credit target
- [x] Build State 2: Audit Mode for locked credit evaluation
- [x] Enforce confidence gating logic:
  - `C <= 64%` hard block
  - `65% <= C <= 85%` reviewer escalation
  - `C >= 86%` direct mapping path
- [x] Keep AI advisory-only for workflow mutation authority
- [~] Keep Harita conversation memory persistent at project scope with stronger cross-turn objective retention
- [~] Complete attachment pipeline split between conversational analysis and governed workflow upload at all remaining behavioral edges
- [~] Complete silent orchestration and response normalization so all simple conversational turns remain compact and non-telemetric

### Phase 4: Enterprise Token Economy & Limits Schema

- [ ] Migrate wallets to client-level ownership
- [ ] Wire automated debit triggers for audit/consultation/export actions
- [ ] Build multi-page document token caps and warnings
- [ ] Deploy project ceilings and contributor quotas controlled by `L5`

## 3. Anti-Faking Verification Protocol & Explicit Integration Checks

- [~] Route and state parameter check:
  - persistent outer `HaritaContextProvider` is active
  - queue-first routes are active in React
- [~] Real-time Supabase ledger audit:
  - React realtime invalidation is active for workspace and review queue surfaces
  - DB-owned token decrement proof still pending in the active React scope
- [~] L0 role-gate and database RLS assertion proof:
  - React role-check snippets are now centralized and active
  - explicit database RLS proof artifacts for reviewer queue / admin token actions still pending in the active React scope

## 4. Verification Status

Completed in the active React scope:
- React queue-first navigation
- React `My Queue` operational surface
- React three-pane reviewer workspace
- React backend-driven review queue and review actions
- React realtime workspace/review invalidation
- Project Admin React surface narrowing
- Backend-owned Project Admin ops summary endpoint
- Review-action conflict responses with current state + allowed actions
- Shared React role normalization and role-level gating helpers
- Harita inline composer attachment flow
- Harita project-scoped session persistence for messages/input/objective state

Still pending in the active React scope:
- final role-framework closure across AI server + database enforcement proof artifacts
- deeper Harita memory + response-behavior closure
- token economy implementation
- explicit anti-faking proof artifacts for L0/RLS and token ledger enforcement

## Historical Archive Boundary

The following are intentionally excluded from the active TODO:
- older Next.js implementation items
- broad historical audit ledgers
- superseded handoff backlogs
- legacy runtime hardening lists not present in `C:\Users\91922\Desktop\New Text Document.txt`
