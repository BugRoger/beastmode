# Design: Retro Quick-Exit Removal & Release Phase Normalization

**Date:** 2026-03-08
**Feature:** retro-quick-exit

## Goal

Ensure the phase retro always runs and lives in checkpoint across all five phases, eliminating the subjective quick-exit check that allowed Claude to skip retros — especially problematic during design where decisions are the primary output.

## Approach

1. Remove the quick-exit check from `retro.md` and replace with an explicit "always run" note
2. Restructure the release phase: move merge/ship operations from execute to checkpoint so retro has a consistent home in checkpoint across all phases

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Quick-exit behavior | Remove entirely | Retro agents already handle empty phases gracefully — context walker returns "No changes needed", meta walker returns "no findings". Quick-exit was premature optimization. |
| Quick-exit replacement | Add explicit "always run" note | Makes the design decision legible to future readers and future Claudes. |
| Release retro location | Move to checkpoint | All other phases (design, plan, implement, validate) run retro from checkpoint. Release was the exception with retro at execute step 8.5. |
| Release merge/ship location | Move from execute to checkpoint | Execute handles prep work (version detection, release notes, changelog, version bump, L0 proposal). Checkpoint handles retro + merge + ship. Clean separation. |

### Claude's Discretion

- Exact wording of the "always run" note in retro.md
- Step renumbering in retro.md after quick-exit removal
- Step numbering in the new release/3-checkpoint.md

## Component Breakdown

### 1. retro.md (shared across all phases)

**Current:** Has a `## 2. Quick-Exit Check` section (lines 13-20) with three subjective conditions that gate the entire retro.

**Change:** Replace the quick-exit section with a brief note: "Retro always runs. Context and meta walkers handle empty phases gracefully." Renumber subsequent sections.

### 2. release/1-execute.md

**Current:** Contains steps 1-12, including:
- Step 8.5: Phase Retro (`@../_shared/retro.md`)
- Step 9: Squash Merge to Main
- Step 10: Commit Release
- Step 11: Git Tagging
- Step 12: Plugin Marketplace Update

**Change:** Remove steps 8.5 through 12. Execute ends after step 8 (Prepare L0 Update Proposal).

### 3. release/3-checkpoint.md

**Current:** Only has 2 steps: Context Report and Complete.

**Change:** Expand to include:
1. Phase Retro (`@../_shared/retro.md`)
2. Squash Merge to Main (from execute step 9, with worktree-manager reference)
3. Commit Release (from execute step 10)
4. Git Tagging (from execute step 11)
5. Plugin Marketplace Update (from execute step 12)
6. Context Report (`@../_shared/context-report.md`)
7. Complete

**Ordering constraint:** Retro runs first while still in the worktree. Merge happens after retro, moving us to main. Context report and completion happen on main.

## Files Affected

- `skills/_shared/retro.md` — Remove quick-exit, add always-run note
- `skills/release/phases/1-execute.md` — Remove steps 8.5-12
- `skills/release/phases/3-checkpoint.md` — Add retro + merge + ship steps

## Acceptance Criteria

- [ ] `retro.md` has no quick-exit section
- [ ] `retro.md` has an explicit "always run" statement
- [ ] All 5 checkpoint files contain `@../_shared/retro.md`
- [ ] `release/1-execute.md` ends at step 8 (L0 proposal prep)
- [ ] `release/3-checkpoint.md` includes retro, merge, commit, tag, marketplace, context report
- [ ] `release/1-execute.md` no longer references retro.md

## Testing Strategy

N/A — prompt engineering changes, not executable code. Verification is manual: run a design cycle and confirm retro executes.

## Deferred Ideas

None.
