---
phase: plan
slug: exhaustive-sweep
epic: exhaustive-sweep
feature: exhaustive-sweep
wave: 1
---

# Exhaustive Sweep

**Design:** `.beastmode/artifacts/design/2026-04-03-exhaustive-sweep.md`

## User Stories

1. As a designer, I want the gray area sweep to automatically surface all remaining ambiguity in batches, so that I don't have to manually ask for more rounds and risk missing blind spots.
2. As a designer, I want to skip the remaining gray area sweep at any point, so that I can move to validation when I'm confident the design is complete enough.
3. As a designer using the express path (existing doc as input), I want the same exhaustive sweep behavior, so that external documents get the same thoroughness as organic decision trees.

## What to Build

Rewrite the "Gray Area Sweep" section (Execute step 2) of the design skill from an opt-in continuation model to an auto-continuation loop.

**Current behavior:** After resolving a batch of 3 gray areas, the skill asks "3 more or satisfied?" — continuation is opt-in, users tend to stop early.

**New behavior:** The skill automatically presents the next batch of 3 gray areas after resolving the current batch. The loop terminates when 0 gray areas remain. Each batch's `AskUserQuestion` includes a "Skip — move to validation" option as an explicit escape hatch.

**Key mechanics:**

- **Auto-continue loop:** After resolving a batch, immediately analyze for next batch. If gray areas remain, present them. If 0 remain, declare sweep complete and proceed to step 3.
- **Batch presentation:** Use `AskUserQuestion` with `multiSelect: true`. Options are the gray areas (up to 3) plus "Skip — move to validation". The built-in "Other" option remains available for user-raised concerns.
- **Partial batches:** When fewer than 3 gray areas remain, present whatever exists (1 or 2). When 0 remain, the loop ends — no question is asked.
- **Skip precedence:** If "Skip" is selected alongside gray area options, treat as skip — exit the loop immediately, do not discuss the co-selected areas.
- **Deduplication:** Maintain a session-scoped list of resolved gray areas. Never re-present areas that were discussed in previous batches.
- **Express path:** The express path (Phase 0, step 4) already jumps directly to the gray-area sweep. The rewritten sweep section applies equally — no separate express-path changes needed.

**Architectural decisions (cross-cutting):**

| Decision | Choice |
|----------|--------|
| Loop model | Auto-continue until 0 gray areas remain |
| Escape mechanism | "Skip — move to validation" option in each AskUserQuestion |
| Skip precedence | Skip wins over co-selected gray areas |
| Deduplication | Session-scoped tracking, never re-present resolved areas |
| Batch size | 3 (unchanged) |
| Express path | Inherits rewritten sweep — no separate change |

## Acceptance Criteria

- [ ] Gray area sweep auto-continues past the first batch without prompting "3 more or satisfied?"
- [ ] Sweep terminates naturally when 0 gray areas remain (no final question asked)
- [ ] Partial batches (1-2 items) are presented correctly
- [ ] "Skip — move to validation" option appears in every batch's AskUserQuestion
- [ ] Selecting "Skip" alongside gray area options exits the loop immediately (skip wins)
- [ ] Previously discussed gray areas are not re-surfaced in later batches
- [ ] Express path (existing doc input) uses the same auto-continue loop
- [ ] The "Other" option remains available for user-raised gray areas
- [ ] The "You decide" option remains on per-area questions (unchanged)
