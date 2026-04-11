# Sync Phase Gating

## Context
The sync engine reads design artifacts (`readPrdSections`) and plan files (`syncFeature`) on every sync tick. Before this change, if the producing phase had not yet completed, these reads would fail with "file not found" and log at WARN or ERROR level. During routine operation — e.g., a design-phase epic — the log was dominated by expected missing-artifact warnings that were not actionable.

An audit of `cli/src/github/` found 20 warn/error calls across 6 files; only 4 were misleveled. 2 were phase-progression artifacts (design artifact missing during design phase, plan files missing during plan phase) and 2 were idempotent success paths logged at the wrong level.

## Decision
Phase gates were added using `isPhaseAtOrPast(epic.phase, threshold)`:
- `readPrdSections` skips when `!isPhaseAtOrPast(epic.phase, "plan")` — design artifact exists from plan onward
- `syncFeature` plan file reads skip when `!isPhaseAtOrPast(epic.phase, "implement")` — plan artifacts exist from implement onward
- Both gates log the skip at `debug` level for traceability

Two additional log level corrections:
- `createLinkedBranch returned null` (branch-link.ts): warn → debug — null means branch already exists, the idempotent success path
- `readPrdSections` catch block (sync.ts): error → warn — readable artifact that fails to parse is degradation, not hard error; sync continues

Phase context is injected via `logger.child({ phase: epic.phase })` at the `syncGitHub` entry point, so all downstream calls inherit it without per-call wiring.

## Consequence for Existing Tests
Tests that verify "warn on missing artifact" must use a post-threshold phase. A test using `phase: "plan"` with a missing plan file no longer reaches the file-read path — the gate short-circuits. Tests were updated to use `phase: "implement"` or later.

## Rationale
Using `isPhaseAtOrPast()` centralizes the comparison in one testable utility rather than scattered string comparisons throughout the sync code. Phase gates eliminate an entire class of expected-but-noisy warnings without changing warn-and-continue behavior for actual failures.

## Source
.beastmode/artifacts/design/2026-04-11-sync-log-hygiene.output.json
