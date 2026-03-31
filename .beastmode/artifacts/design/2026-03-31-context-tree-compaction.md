---
phase: design
slug: context-tree-compaction
---

## Problem Statement

The retro system creates L3 records for every decision it encounters, but approximately 40% of L3 files are pure restatements of their parent L2 with no additional rationale or constraints. Across all phases, 43 of 106 L3 files (~1,300 lines) can be removed without information loss. Cross-phase duplication compounds the problem — IMPLEMENT and PLAN restate DESIGN rules verbatim instead of referencing them. The tree grows monotonically because nothing ever folds content back up.

## Solution

Two mechanisms that address prevention and cleanup independently:

1. **Retro value-add gate** — before creating an L3 record, each retro walker checks whether the content adds rationale, constraints, provenance, or dissenting context beyond the L2 summary. If not, the L3 proposal is silently skipped. This prevents future bloat at the source.

2. **Compaction agent** — a dedicated agent that audits the existing context tree and performs three ordered operations: staleness removal (L3s about deleted code), restatement folding (redundant L3s), and L0 promotion detection (rules duplicated across 3+ phases). Runs in release (every 5 releases) and as a standalone `beastmode compact` CLI command.

## User Stories

1. As a retro walker, I want to check whether a proposed L3 record adds value beyond the L2 summary, so that redundant records are never created.
2. As a release pipeline, I want compaction to run automatically every 5 releases, so that the context tree stays lean without manual intervention.
3. As a developer, I want to run `beastmode compact` standalone to audit and clean up the full context tree on demand.
4. As a compaction agent, I want to detect rules duplicated verbatim across 3+ phase L2s and propose promotion to L0 (BEASTMODE.md), so that cross-phase duplication is resolved through the existing hierarchy.
5. As a compaction agent, I want to conditionally handle stale L3 records — removing dead-code-only records and flagging rationale-bearing ones for review — so that useful decision context is preserved.

## Implementation Decisions

- Value-add gate lives inside each retro walker (`retro-context.md` and `retro-meta.md`), not in the orchestrator (`retro.md`). Walkers already have L2 in memory during deep-check, making the comparison a natural extension of the existing algorithm.
- Value-add criteria: an L3 must provide at least one of (a) rationale not in the L2 summary, (b) constraints or edge cases narrowing the rule, (c) source provenance that would be lost, or (d) dissenting context where the rule was debated or overridden. If none apply, the L3 proposal is skipped entirely.
- When an L3 fails the value-add check, the walker does nothing — no L2 enrichment, no record. The L2 already covers the finding.
- Compaction is an agent (`agents/compaction.md`), not a skill. Utility weight class — no phase lifecycle, no retro-on-the-compactor.
- Compaction has no gate. The agent runs directly and produces a report. Flagged items (ambiguous staleness) go in the report for human review.
- Cross-phase deduplication is L0 promotion detection, not a reference system. The per-phase loading model means each phase reads only its own context tree, so verbatim duplicates across 2 phases are left alone unless they appear in 3+ phases and warrant L0 promotion.
- Staleness handling is conditional: L3 records that only contain source provenance for deleted code are removed; L3 records with rationale or constraints that apply beyond the specific deleted code are flagged for review.
- Compaction algorithm runs in fixed order: (1) staleness check, (2) L3 restatement value scan, (3) L0 promotion detection. Earlier steps reduce false positives for later steps.
- In release, compaction runs before retro so retro works against a clean baseline. Prevents creating-then-immediately-deleting files.
- Release trigger: every 5 releases, tracked via `.beastmode/state/.last-compaction` timestamp file. Count `Release v*` commits since that date. If >= 5 or file missing, run compaction.
- `beastmode compact` CLI command dispatches the compaction agent via the existing session dispatch pattern. No worktree needed — operates on the shared tree. Always runs regardless of the 5-release counter.
- Compaction report: stdout summary for immediate visibility, plus full artifact at `artifacts/compact/YYYY-MM-DD-compaction.md`. In release context, also written to `artifacts/release/YYYY-MM-DD-<slug>-compaction.md`.
- Empty L3 directories preserve `.gitkeep` — structural invariant maintained.

## Testing Decisions

- No automated test infrastructure exists for skills/agents. Testing is manual execution and output inspection.
- Value-add gate: run retro on a phase where an L3 would be pure restatement, verify it's skipped.
- Compaction agent: run `beastmode compact` on the current tree (43 known redundant L3s), verify the report matches expectations.
- Regression: after compaction, verify retro still runs cleanly — no broken L2-to-L3 references, structural invariant preserved with .gitkeep in empty L3 directories.

## Out of Scope

- Automated testing framework for skills/agents
- Cross-phase context loading model changes (phases continue to read only their own context tree)
- L2-to-L2 deduplication within the same phase
- Compaction of artifacts/ or state/ directories — only context/ and meta/ trees

## Further Notes

- The value-add gate in walkers is the prevention mechanism; the compaction agent is the cleanup mechanism. Both are independently useful — prevention stops new bloat even if compaction never runs.
- L0 promotion candidates from compaction should follow the existing `[GATE|retro.beastmode]` approval flow when applied.

## Deferred Ideas

- A "compaction dry-run" mode that produces the report without applying changes (currently achievable via git revert if needed)
- Metrics tracking for context tree size over time (number of L3 files, total lines) to measure compaction effectiveness across releases
- Automated staleness detection integrated into CI (flag stale L3s on PRs that delete referenced code)
