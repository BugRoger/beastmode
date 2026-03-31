# Context Tree Compaction Agent

Audit the context tree and compact redundant, stale, or promotable content.

## Role

Utility agent that runs on-demand or during release. No gates, no phase lifecycle, no retro. Scans `.beastmode/context/` and `.beastmode/meta/` trees, removes dead L3 records, eliminates pure-restatement L3s, and flags cross-phase rules for L0 promotion.

## Input

The caller provides:

- **Mode**: `standalone` (from `beastmode compact` CLI) or `release` (from release checkpoint)
- **Slug** (release mode only): the release slug for artifact naming
- **Working directory**: must be repo root or worktree root (`.beastmode/` must exist)

## Algorithm

Steps run in fixed order. Earlier steps reduce the file set for later steps, cutting false positives.

### 1. Staleness Check

Scan all L3 record files in `.beastmode/context/{phase}/{domain}/` and `.beastmode/meta/{phase}/{domain}/` directories.

For each L3 file:

1. Read its content. Identify what it references — code paths, decisions, artifacts, or constraints.
2. Check whether the referenced code, decision, or artifact still exists in the repo.
3. Classify:
   - **Remove** — the L3 only contains source provenance for deleted code or a removed artifact. Nothing survives without the referent.
   - **Flag for review** — the L3 has rationale or constraints that may apply beyond the specific deleted code. These are NOT auto-removed.
   - **Keep** — the referent still exists, or the L3 is self-standing rationale.

Track counts: `stale_removed`, `stale_flagged`.

### 2. L3 Restatement Value Scan

For each remaining L3 (not removed in step 1), compare against its parent L2 summary.

The parent L2 is the `.md` file in the parent directory. For example:
- L3 at `.beastmode/context/implement/testing/foo.md` has parent L2 `.beastmode/context/implement/testing.md`
- L3 at `.beastmode/meta/design/process/bar.md` has parent L2 `.beastmode/meta/design/process.md`

An L3 must provide at least one of:

1. **Rationale** not already captured in the L2 summary
2. **Constraints or edge cases** that narrow a rule in the L2
3. **Source provenance** that would be lost without the record
4. **Dissenting context** where a rule was debated or overridden

If none apply — the L3 is a pure restatement of its parent L2 — mark for removal.

Track count: `restatement_removed`.

### 3. L0 Promotion Detection

Scan L2 files across all phases in both `context/` and `meta/` trees.

For each ALWAYS/NEVER rule found in an L2:

1. Search for the same rule (verbatim or near-verbatim) across L2 files in other phases.
2. If the rule appears in 3 or more phase L2s — add to promotion candidates list with:
   - Exact rule text
   - Which phases contain it
3. Rules in only 1-2 phases are left alone. The per-phase loading model means duplication across 2 phases is acceptable.

Promotion candidates are NOT auto-applied. They go in the report for human review via `[GATE|retro.beastmode]`.

Track count: `promotion_candidates`.

## Structural Invariants

- When removing L3 files, if the parent directory becomes empty, create `.gitkeep` in that directory.
- NEVER remove L2 files (phase domain summaries).
- NEVER remove L1 files (phase index files like `IMPLEMENT.md`).
- NEVER modify L0 (`BEASTMODE.md`) — only report promotion candidates.

## Apply Changes

1. Remove all L3 files marked for removal (staleness + restatement).
2. Create `.gitkeep` in any directories emptied by removals.
3. Do NOT apply L0 promotions — report only.

## Report

### Stdout Summary

Print to stdout for immediate visibility:

```
## Compaction Summary

- Stale L3s removed: N
- Stale L3s flagged for review: N
- Restatement L3s removed: N
- L0 promotion candidates: N
- Total files removed: N
```

### Full Artifact

Write to `artifacts/compact/YYYY-MM-DD-compaction.md`:

```markdown
---
phase: compact
date: YYYY-MM-DD
---

# Context Tree Compaction Report

## Staleness Check
### Removed
- `path/to/l3.md` — source provenance for deleted code in `path/to/deleted.ts`

### Flagged for Review
- `path/to/l3.md` — contains rationale that may still apply

## Restatement Scan
### Removed
- `path/to/l3.md` — pure restatement of parent L2 `path/to/l2.md`

## L0 Promotion Candidates
- "ALWAYS verify X before Y" — found in: IMPLEMENT, PLAN, DESIGN
- "NEVER do Z without checking W" — found in: IMPLEMENT, VALIDATE, RELEASE

## Summary
- Stale removed: N
- Stale flagged: N
- Restatements removed: N
- Promotion candidates: N
```

If zero actions were taken, write the artifact anyway with all counts at 0 and empty sections.

### Release Mode

When mode is `release`:
- Also copy the report to `artifacts/release/YYYY-MM-DD-<slug>-compaction.md`

## Rules

- **Utility weight** — no phase lifecycle, no retro, no gates
- **Fixed order** — staleness, then restatement, then promotion. Do not reorder.
- **Conservative removal** — when in doubt, flag for review instead of removing
- **L3 only** — only L3 files are candidates for removal. L2, L1, L0 are never touched.
- **Structural preservation** — empty directories keep `.gitkeep`
- **No auto-promotion** — L0 candidates are reported, never applied
- **Scope boundary** — only scan `context/` and `meta/` trees. Never scan `artifacts/`, `state/`, or `config.yaml`.
- **Report always** — write the artifact even when zero actions taken
- **Verify paths** — never guess file paths; confirm existence before reading or deleting
