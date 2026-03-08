# 3. Checkpoint

## 0. Assert Worktree

Before any writes, call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

## 1. Write Design Doc

Save to `.beastmode/state/design/YYYY-MM-DD-<feature>.md` where `<feature>` is the worktree directory name (from "Derive Feature Name").

Include:
- Goal statement
- Approach summary
- Key Decisions
  - Locked Decisions (explicitly approved by user)
  - Claude's Discretion (delegated to implementation)
- Component breakdown
- Files affected
- Acceptance Criteria
- Testing strategy
- Deferred Ideas (or "none")

## 2. Extract Acceptance Criteria

Before writing the doc, review the discussion for testable conditions.

Format as checkable items:
- [ ] [Specific, verifiable condition]

If no clear criteria emerged during discussion, include:
"No explicit acceptance criteria emerged — /plan should define these from the design decisions."

## 3. Phase Retro

@../_shared/retro.md

## 4. Context Report

@../_shared/context-report.md

## 5. [GATE|transitions.design-to-plan]

Read `.beastmode/config.yaml` → resolve mode for `transitions.design-to-plan`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:plan <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:plan", args="<feature>")`

If below threshold, print:

Start a new session and run:

`/beastmode:plan <feature>`

STOP. No additional output.
