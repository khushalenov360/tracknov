# Tracknov Agent Protocol

> This file governs how the AI agent operates in this repository.
> Read this at the start of every task before touching anything.

---

## Workflow

Every task follows this sequence:

```
User gives task
      ↓
Orchestrator defines scope (files + change description)
      ↓
tracknov-fault-finder-v2 (PHASE 1) reviews instructions:
  - Are instructions precise enough?
  - Is scope correct?
  FAIL → Orchestrator fixes instructions
  PASS → Proceeds
      ↓
tracknov-coder subagent executes
      ↓
tracknov-fault-finder-v2 (PHASE 2) reviews output:
  - Scope compliance (git diff --name-only vs approved files)
  - Logic correctness (git diff review)
  - Visual verification (screenshot of running app)
      ↓
  FAIL → back to tracknov-coder (max 2 retries)
  FAIL after 2 retries → escalate to user
      ↓
  PASS → commit + push → report to user
```

---

## Protected Files — Do Not Touch Without Explicit Instruction

The following files require the user to explicitly name them in the task before the agent may open or edit them:

- `apps/tracknov-web/app/globals.css`
- `apps/tracknov-web/tailwind.config.ts`
- `apps/tracknov-web/postcss.config.js`
- `apps/tracknov-web/package.json`
- `package-lock.json`
- Any `*.sql` migration file

---

## Coding Rules (tracknov-coder)

1. Only edit files listed in the approved scope
2. Always use `replace_file_content` or `multi_replace_file_content` — never `write_to_file` with `Overwrite: true` on an existing file
3. Read the file from git before editing — never write from memory
4. Change the minimum number of lines required
5. Do not refactor, rename, or reformat anything outside the scope
6. Report exactly what was changed (file, line range, before/after)

---

## Fault-Finding Rules (tracknov-fault-finder-v2)

1. Never write or edit code
2. Always review instructions (Phase 1) BEFORE coder executes to catch bad scope/vagueness
3. Always run `git diff --name-only` to check scope compliance (Phase 2)
4. Always take a screenshot of the running app to verify visual output (Phase 2)
5. Reject on any scope violation, no exceptions
6. Provide line-level feedback when rejecting code
7. Provide specific critique when rejecting instructions

---

## Escalation

If the coding subagent fails to produce a clean result after 2 retries, the orchestrator escalates to the user with:
- What was attempted
- What the fault-finder found
- What decision is needed from the user
