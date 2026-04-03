---
phase: design
slug: exhaustive-sweep
epic: exhaustive-sweep
---

## Problem Statement

The gray area sweep in the design phase exits prematurely because continuation is opt-in. After each batch of 3 gray areas, the skill asks "3 more, or satisfied?" — users tend to select "satisfied" before all ambiguity is surfaced. The sweep should keep going until the well is genuinely dry.

## Solution

Change the gray area sweep from opt-in continuation to auto-continuation. The skill keeps surfacing batches of 3 gray areas until it cannot find any more. When 0 remain, it declares done and moves to validation. The user can short-circuit at any point via an explicit "Skip — move to validation" option.

## User Stories

1. As a designer, I want the gray area sweep to automatically surface all remaining ambiguity in batches, so that I don't have to manually ask for more rounds and risk missing blind spots.
2. As a designer, I want to skip the remaining gray area sweep at any point, so that I can move to validation when I'm confident the design is complete enough.
3. As a designer using the express path (existing doc as input), I want the same exhaustive sweep behavior, so that external documents get the same thoroughness as organic decision trees.

## Implementation Decisions

- Loop termination: auto-continue until 0 gray areas remain, replacing the current "3 more or satisfied?" prompt
- Batch size: 3 gray areas per round (unchanged)
- Partial batches: present whatever remains (1 or 2) when fewer than 3 gray areas exist; 0 = sweep complete
- User escape hatch: add "Skip — move to validation" as an explicit option in each batch's `AskUserQuestion` multi-select
- Skip precedence: if "Skip" is selected alongside gray areas, Skip wins — treat as done
- Deduplication: track resolved gray areas within the session; never re-present areas already discussed in previous batches
- Express path: same auto-continue loop applies when jumping to gray area sweep from an existing document
- The `AskUserQuestion` built-in "Other" option remains available for users to raise their own gray areas

## Testing Decisions

- Run a design session and verify the sweep auto-continues past the first batch without prompting "3 more or satisfied?"
- Verify the sweep terminates naturally when presenting 0 gray areas
- Verify partial batches (1-2 items) are presented correctly
- Verify "Skip" option exits the loop immediately even when gray areas are also selected
- Verify previously discussed gray areas are not re-surfaced in later batches

## Out of Scope

- Changing the decision tree walk (Phase 1, Step 1)
- Changing batch size to be configurable
- Changing the gray area presentation format beyond adding the Skip option

## Further Notes

None

## Deferred Ideas

None
