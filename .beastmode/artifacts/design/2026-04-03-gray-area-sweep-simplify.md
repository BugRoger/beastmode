---
phase: design
slug: gray-area-sweep-simplify
epic: gray-area-sweep-simplify
---

## Problem Statement

The gray area sweep in the design skill forces multi-select checkboxes and loop re-confirmations that create unnecessary friction. The user must select which gray areas to discuss from a list, then after each batch the loop asks again if there are more. This double-approval pattern slows down the design flow and adds interaction overhead without adding value.

## Solution

Replace the batched multi-select loop with a serial one-at-a-time flow. Present one gray area, discuss it, move to the next. The user bails out at any time via the freeform Other field — no dedicated "Skip" option cluttering the choices. Gray areas are presented in priority order (most ambiguous first).

## User Stories

1. As a designer, I want gray areas presented one at a time so that I can focus on each without checkbox overhead.
2. As a designer, I want to bail out of the sweep at any point via freeform input so that I control the pace without extra confirmation steps.
3. As a designer, I want gray areas ordered by ambiguity so that the most important ones get resolved first.

## Implementation Decisions

- Replace the multi-select `AskUserQuestion` loop with a serial presentation model: analyze remaining gray areas, present the most ambiguous one, discuss it via standard `AskUserQuestion` (single-select with relevant options), mark it resolved, repeat.
- Remove the "Skip — move to validation" dedicated option. The built-in Other field on `AskUserQuestion` is the bail-out mechanism. If the user types anything indicating they want to skip (e.g., "skip", "done", "move on"), the sweep exits immediately.
- Remove the "You decide" explicit delegation option from gray area questions. The Other field covers this — users can type "you decide" if they want to delegate.
- Maintain the session-scoped resolved list so gray areas are never re-presented.
- Annotate each gray area presentation with codebase context when relevant (same intent as before, adapted to serial model).
- Keep the termination condition: when the agent analyzes and finds 0 remaining gray areas, the sweep is complete. No confirmation needed.
- Ordering: most ambiguous gray area first within each iteration of the loop.

## Testing Decisions

- Verify the sweep exits cleanly when the user types "skip" or equivalent via Other.
- Verify gray areas are never re-presented after being resolved.
- Verify the sweep terminates naturally when no gray areas remain (no extra confirmation).
- Prior art: the existing design skill test pattern is manual — run a design session and observe the interaction flow.

## Out of Scope

- Changes to the decision tree walk (Phase 1, Step 1) — only the gray area sweep is affected.
- Changes to the validate phase or checkpoint phase.
- Changes to the express path or existing design check in prime.

## Further Notes

None

## Deferred Ideas

None
