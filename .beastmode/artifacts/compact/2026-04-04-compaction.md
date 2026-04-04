---
phase: compact
date: 2026-04-04
---

# Context Tree Compaction Report

## Staleness Check

### Removed
- `.beastmode/context/design/dashboard/view-stack.md` — self-declared REMOVED tombstone for deleted push/pop navigation model replaced by flat three-panel layout
- `.beastmode/context/plan/workflow/session-tracking.md` — pure source provenance for deleted session tracking system (`skills/_shared/session-tracking.md` removed in v0.3.4, `.beastmode/status/` directory never existed)

### Flagged for Review
- `.beastmode/context/design/orchestration/decorator-forwarding.md` — references `cli/src/reconciling-factory.ts` (stale path; class now lives in `commands/watch.ts`). Decision/rationale still valid.
- `.beastmode/context/design/dashboard/shared-data-module.md` — describes `shared/status-data.ts` module that was absorbed into `status.ts` directly. Rationale still valid.
- `.beastmode/context/design/product/core-capabilities.md` — describes removed artifacts (Justfile orchestrator, WorktreeCreate hook, `/beastmode orchestrate` subcommand, stale log format). Capability inventory has value but specifics are several generations out of date.
- `.beastmode/context/implement/cmux-integration/best-effort-visual-cleanup.md` — references `cli/src/reconciling-factory.ts` (stale path; now in `commands/watch.ts`). Decision still applies.
- `.beastmode/context/implement/cmux-integration/client-architecture.md` through `testing-approach.md` (6 files) — all reference `cli/src/cmux-client.ts` (moved to `cli/src/dispatch/cmux.ts`). Source paths stale, decisions/rationale survive. (Note: 5 of these were removed as restatements; `best-effort-visual-cleanup.md` retained for unique content.)
- `.beastmode/context/implement/github-integration/body-enrichment.md` — describes `section-extractor.ts` and `section-splitter.ts` as separate modules; consolidated into `cli/src/artifacts/reader.ts`.

## Restatement Scan

### Removed
- `.beastmode/context/design/phase-transitions/phase-detection.md` — pure restatement of parent L2 `.beastmode/context/design/phase-transitions.md` Phase Detection section (trivially different phrasing: "four-case matrix is exhaustive" vs "covers all possible states")
- `.beastmode/context/design/phase-transitions/phase-tags.md` — pure restatement of parent L2 `.beastmode/context/design/phase-transitions.md` Phase Tags section ("namespace isolation prevents collision" vs "namespace avoids collision with user-created tags")
- `.beastmode/context/implement/cmux-integration/client-architecture.md` — pure restatement of parent L2 `.beastmode/context/implement/cmux-integration.md` (L2 already covers class-based client, SpawnFn injection, ICmuxClient interface, exec() method)
- `.beastmode/context/implement/cmux-integration/error-hierarchy.md` — pure restatement of parent L2 (L2 already has all four error classes, triggers, rename, detection strategy)
- `.beastmode/context/implement/cmux-integration/idempotent-close-pattern.md` — pure restatement of parent L2 (L2 already covers swallow "not found", rethrow variants)
- `.beastmode/context/implement/cmux-integration/method-signatures.md` — pure restatement of parent L2 (L2 already has all method names, parameter shapes, renames)
- `.beastmode/context/implement/cmux-integration/testing-approach.md` — pure restatement of parent L2 (L2 already covers SpawnFn injection, mockProc(), ReadableStream fakes, 33 tests)
- `.beastmode/context/implement/github-integration/api-boundary.md` — pure restatement of parent L2 (L2 already says "ALL GitHub operations are CLI-owned via github-sync.ts")
- `.beastmode/context/implement/github-integration/checkpoint-sync-pattern.md` — pure restatement of parent L2 (L2 fully covers checkpoint placement and per-phase operations)
- `.beastmode/context/implement/github-integration/error-handling.md` — pure restatement of parent L2 (L2 already covers warn-and-continue, manifest without github blocks)
- `.beastmode/context/implement/pipeline-machine/machine-architecture.md` — pure restatement of parent L2 (L2 covers both machines, 7+3 states, terminal types, setup() API, CANCEL from all non-terminal)
- `.beastmode/context/implement/testing/critical-paths.md` — pure restatement of parent L2 `.beastmode/context/implement/testing.md` (same four core scenarios, same three ALWAYS rules)
- `.beastmode/context/plan/github-integration/configuration-extension.md` — pure restatement of parent L2 (L2 already covers github.enabled, project-name, setup subcommand)
- `.beastmode/context/plan/github-integration/issue-hierarchy.md` — pure restatement of parent L2 (L2 covers two-level hierarchy, sub-issues API, GraphQL roll-up)
- `.beastmode/context/validate/quality-gates/standard-gates.md` — pure restatement of parent L2 `.beastmode/context/validate/quality-gates.md` (L2 already covers attempt-even-if-skipped, annotate-rationale, skipped-not-failure)
- `.beastmode/context/validate/validation-patterns/acceptance-criteria-verification.md` — pure restatement of parent L2 `.beastmode/context/validate/validation-patterns.md` (L2 already covers trace-to-criterion, PASS/FAIL/DEFER)

## L0 Promotion Candidates

1. "ALWAYS use squash merge at release -- one commit per version on main" -- found in: design, plan, release
2. "ALWAYS archive feature branch tip before squash merge / before deletion" -- found in: design, plan, release
3. "ALWAYS run retro before the release commit" -- found in: design, plan, release
4. "ALWAYS use warn-and-continue for GitHub API failures -- never block local workflow" -- found in: design, plan, implement
5. "ALWAYS use manifest JSON as operational authority -- GitHub is a one-way mirror" -- found in: design, plan, implement
6. "NEVER make skills GitHub-aware or manifest-aware -- skills write artifacts with frontmatter only" -- found in: design, plan, implement
7. "ALWAYS use standardized frontmatter across all phase artifacts" -- found in: design, plan, implement
8. "ALWAYS sync GitHub after every phase dispatch -- same code path for manual and watch loop" -- found in: design, plan, implement
9. "ALWAYS use two-level hierarchy: Epic (capability) > Feature (work unit)" -- found in: design, plan, implement
10. "ALWAYS use presence-based rendering for issue body sections" -- found in: design, plan, implement
11. "ALWAYS extract artifact content at sync time -- never store in manifest" -- found in: design, plan, implement
12. "ALWAYS verify file isolation before parallel dispatch" -- found in: design, plan, implement
13. "NEVER commit during implement/phases -- release owns the merge" -- found in: plan, implement, release
14. "ALWAYS follow the five-phase order: design -> plan -> implement -> validate -> release" -- found in: design, plan, validate, release
15. "NEVER write to context/ directly from phases -- retro and compaction agent are sole gatekeepers" -- found in: design, plan, implement

## Summary

- Stale removed: 2
- Stale flagged: 8
- Restatements removed: 16
- Promotion candidates: 15
