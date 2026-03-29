# Release Retro Commit Fix

## Goal

Ensure all phase retro outputs get committed, eliminating untracked meta files after release.

## Research

After /release merges the worktree to main and cleans up, the retro runs on main. Meta file changes from the retro are never committed, leaving untracked modifications.

Other phases (design/plan/implement/validate) don't have this problem — their retros run inside the worktree, and /release commits everything.

## Approach

Move the release retro from 3-checkpoint to 1-execute, running it before the commit step. Retro output gets included in the unified release commit.

## Key Decisions

### Move retro before commit (correctness)
- Current: release 3-checkpoint runs retro after merge+cleanup. Meta changes land on main uncommitted.
- Fix: Insert retro in 1-execute between step 7 (Bump Version Files) and current step 8 (Commit).
- Rationale: All other phases' retros get committed by /release. Release's own retro should be no different.

### Renumber release phases
- 1-execute gains a retro step, current steps 8-11 shift to 9-12
- 3-checkpoint loses retro step, remaining steps renumber

## Components

### 1-execute.md changes
- Insert new step 8: "Phase Retro" with `@../_shared/retro.md`
- Renumber current steps 8-11 → 9-12

### 3-checkpoint.md changes
- Remove "Phase Retro" step (moved to 1-execute)
- Renumber: 1. Context Report → 2. Complete

## Files Affected

- `skills/release/phases/1-execute.md` — add retro step before commit
- `skills/release/phases/3-checkpoint.md` — remove retro, renumber

## Testing Strategy

- Run /release on a feature branch
- Verify no untracked files remain after release completes
- Verify meta learnings appear in the release commit

## Acceptance Criteria

- [ ] No untracked `.beastmode/meta/` files after /release completes
- [ ] Release commit includes meta learnings from retro
- [ ] Retro still produces findings (functionality preserved)

## Deferred Ideas

- Design doc on main was a one-off from bypassing /design — no structural fix needed.
