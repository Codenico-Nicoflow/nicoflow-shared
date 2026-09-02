---
slug: harness
consumers: [api, shared, frontend, mobile]
status: planned
---

# Nicoflow Agent Harness

Spec-driven, loop-executed development across 4 repos. Replaces Jira + Confluence
with in-repo markdown. Makes cross-repo contract drift a compile error.

## Why

Two problems, one root cause.

**Contract drift.** Backend and frontend types are hand-copied across a boundary
nothing checks. Every repo's gate is green while the system is broken. The memory
files are a graveyard of this: `{url}` vs `{downloadUrl}`, `scheduledTime` drift,
`types` vs `type`, `/attachments` returning a bare array while MSW mocked an
envelope. Local gates structurally cannot catch it.

**Intent lives outside the repo.** Specs are in Confluence, tickets in Jira, code
in git. Nothing links them but a ticket ID in a branch name. An agent can't read
intent without an MCP round-trip, and the three sources drift independently.

Fix both: generate types from one source so drift can't be expressed, and move
intent into git next to the code it governs.

## Scope

### In

- Go structs → Swagger 2.0 → TypeScript, generated, gated in both repos
- Level 2 enrichment of all 17 View types (enums, nullable, required, format)
- `specs/<slug>/` markdown replacing Jira stories and Confluence PRDs
- Headless Ralph loop with tiered gates and 4 terminal states
- Guardrail hooks (the only safety layer under `--dangerously-skip-permissions`)
- Worktree-per-feature isolation
- Per-AC convergence audit

### Out

- Migrating the Jira backlog (lazy — migrate on start, Jira stays read-only)
- Migrating done epics (later, opportunistically)
- Generating API clients or hooks (types only; RTK Query factories stay hand-written)
- Generating Zod schemas (input validation ≠ response types)
- Renaming `ITask` → `TaskView` (shim first, rename is separate later work)

## Non-Goals

- Multi-developer workflow. Solo dev; no assignment, review queues, or velocity.
- Sprints, burndown, estimation.
- Replacing CI. The loop's gates are local; CI stays the remote check.
- Full autonomy. Human writes AC and reviews `tasks.md` before every loop.

## Contract

**Pipeline** (verified empirically, 2026-09-01):

| Stage            | Tool                          | Status                                   |
| ---------------- | ----------------------------- | ---------------------------------------- |
| Go → Swagger 2.0 | swag v1.16.4                  | installed; 79 routes, 54 paths, 124 defs |
| enums            | named Go type + consts        | auto-emitted, no tags needed             |
| nullable         | `extensions:"x-nullable"`     | Kubb honors it (source-verified)         |
| required         | `validate:"required"`         |                                          |
| format           | `format:"date"`               |                                          |
| Swagger 2.0 → TS | Kubb, `enum:{type:'literal'}` | accepts 2.0 directly, no conversion      |

Kubb source, `@kubb/oas/dist/index.js:297`:

```js
if ((schema?.nullable ?? schema?.['x-nullable']) === true) return true;
```

**Current enrichment state:** 424 fields, 0 enums, 0 formats, 0 nullable, 0 required.
Greenfield — no partial state to reconcile.

**Enum consolidation.** `active|done|cancelled` currently exists in 5 places: DB
CHECK, `service.go` unexported consts, `handler.go` inline comparisons,
`ai/tools.go` hardcoded JSON string, TS `constants.ts`. A named Go type collapses
these to one compiler-enforced source.

```go
type TaskStatus string
const (
    TaskStatusActive    TaskStatus = "active"
    TaskStatusDone      TaskStatus = "done"
    TaskStatusCancelled TaskStatus = "cancelled"
)
```

**Codegen location.** `nicoflow-shared` runs Kubb, reads api via
`NICOFLOW_API_PATH` (default `../nicoflow-api`), set per-worktree.

**Staleness gates — both links, no gap:**

```bash
# api:    structs → swagger.json
make swagger && git diff --exit-code docs/swagger.json
# shared: swagger.json → generated TS
pnpm codegen && git diff --exit-code src/generated/
```

**Deleted:** `SPEC.md` §3 endpoint tables. Generated types are the contract; a
hand-written third copy can only drift. (The two SPEC.md copies have already
diverged.)

## Design Risks

| Risk                                       | Mitigation                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| Loop cheats gate by deleting tests         | Hook blocks net test-count reduction                                       |
| Kubb v5 config API differs from docs       | Spike failed on config load; budget a debug pass. Orval is fallback        |
| `x-nullable` silently dropped              | Source-verified, but assert in domain-1 vertical slice before enriching 17 |
| Loop spins burning tokens                  | Halt after 3 no-progress iterations; 50-iteration cap                      |
| Enrichment reveals Go/TS disagreements     | Expected — those are latent bugs. Surface as blockers, don't auto-resolve  |
| Headless + skip-permissions with no hooks  | Hooks are bootstrap step 1, before any loop runs                           |
| Spec re-read cost grows with rich template | If measured painful: Phase 2 reads only `## Contract` + `## AC`            |

## Test Strategy

| Layer                                                            | Covers                                       |
| ---------------------------------------------------------------- | -------------------------------------------- |
| `go build` + `go vet`                                            | Tier 1, api. 2.8s                            |
| `tsc --noEmit`                                                   | Tier 1, shared/frontend/mobile. 14s frontend |
| targeted `vitest run <path>` / `go test ./internal/domain/x/...` | Tier 1, changed area only                    |
| full suites                                                      | Tier 2, every 5th iteration + every push     |
| staleness diff gates                                             | every iteration, both repos                  |
| unlinked clean install                                           | Tier 3, exit gate only                       |
| per-AC audit                                                     | Tier 3, convergence                          |

**Measured gate costs** (why tiering is mandatory, not preference):

| Repo     | Tier 1 | Full suite                      |
| -------- | ------ | ------------------------------- |
| api      | 2.8s   | **184s**                        |
| frontend | 14s    | **88s** (330 files, 2145 tests) |
| shared   | 6s     | 1.7s (227 tests)                |

Full gates every iteration = ~2hr per 40-iteration feature. Not viable.

## Rollout

**Bootstrap — hand-built, in order:**

1. Guardrail hooks ← mandatory first; headless is unsafe without them
2. `PROMPT.md` in `nicoflow-shared`
3. `GATES.md` × 4
4. Kubb wired + both staleness gates
5. `spec-start <slug>` script (worktrees, branches, link, env var)
6. `specs/contract-enrichment/` spec + tasks

**Then the loop runs #6 as its own first job.** Enrichment is ideal dogfood:
mechanical, hard-gated, high-volume, low blast radius.

**Enrichment order** — vertical slices, `task` first (22 fields, most enums —
proves the hardest case immediately), then `note`, `area`, `project`, rest.

Per domain: enrich Go → generate → shim TS (`export type ITask = TaskView`) →
green. Zod stays hand-written, enums linked via
`satisfies readonly TaskStatus[]` so drift is a compile error.

**Rollback:** every domain is an independent commit. Shim means reverting a
domain is a one-line change.

## Acceptance Criteria

- [ ] **AC1** Renaming a field in a Go View struct causes `tsc` to fail in
      `nicoflow-frontend` without any hand-editing of TypeScript.
- [ ] **AC2** All 17 View types emit enums, nullability, required, and formats;
      `grep -c '"enum"' docs/swagger.json` is non-zero and generated TS contains
      literal unions.
- [ ] **AC3** A stale `swagger.json` or stale `src/generated/` fails its repo's
      gate via `git diff --exit-code`.
- [ ] **AC4** A loop run terminates in exactly one of: CONVERGED, BLOCKED,
      STALLED, BUDGET — and never silently continues past 50 iterations or 3
      no-progress iterations.
- [ ] **AC5** Hooks block, mechanically: commit/push on `main`/`staging`,
      `push --force`, `reset --hard`, `clean -fd`, `branch -D`, `rebase`,
      `changeset` in inner loop, `gh pr create`, and net test-count reduction.
- [ ] **AC6** The convergence audit reports per-AC SATISFIED/PARTIAL/MISSING from
      a context that did not perform the implementation, plus whether a
      regression test exists.
- [ ] **AC7** `spec-start <slug>` creates worktrees and branches in exactly the
      repos listed in the spec's `consumers:`, with shared linked and
      `NICOFLOW_API_PATH` set.
- [ ] **AC8** The exit gate fails if any consumer still resolves
      `@nicoflow/shared` to a local path rather than `node_modules`.
- [ ] **AC9** A daily scheduled check reports whether `nicoflow-mobile` compiles
      against the latest published `@nicoflow/shared`; red is visible and
      non-blocking.

## Open Questions

_(empty — resolved in grill 2026-08-31/09-01)_
