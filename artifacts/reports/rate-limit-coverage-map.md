# Tracknov API Rate-Limit Coverage Map

Updated: 2026-05-06 IST

## Coverage policy

- Window-based per-IP throttling via `lib/security/rate-limit.ts`
- Returns `429` with `Retry-After` and rate-limit headers

## Endpoint coverage

| Category | Endpoint | Method | Limit / 60s | Status |
|---|---|---:|---:|---|
| AI | `/api/assistant` | `POST` | 40 | Enforced |
| AI upload | `/api/assistant/project-upload` | `POST` | 20 | Enforced |
| Join flow | `/api/project/join` | `POST` | 15 | Enforced |
| Invite flow | `/api/project/invite` | `POST` | 20 | Enforced |
| Document access | `/api/documents/[id]` | `GET` | 60 | Enforced |
| Export | `/api/projects/[id]/submission-pack` | `GET` | 10 | Enforced |
| Export | `/api/projects/[id]/audit-export` | `GET` | 10 | Enforced |
| Export | `/api/projects/[id]/client-report` | `GET` | 10 | Enforced |
| Export | `/api/projects/[id]/summary` | `GET` | 12 | Enforced |
| Export | `/api/projects/[id]/tracker` | `GET` | 12 | Enforced |

## Notes

- Login/session auth is Supabase-managed; no custom `/api/login` route exists in this codebase.
- Workflow mutations are server-action heavy; API throttling above covers exposed write endpoints.
