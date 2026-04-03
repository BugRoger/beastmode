---
phase: plan
slug: gray-area-sweep-simplify
epic: gray-area-sweep-simplify
feature: sweep-rewrite
wave: 1
---

# Sweep Rewrite

**Design:** `.beastmode/artifacts/design/2026-04-03-gray-area-sweep-simplify.md`

## User Stories

1. As a designer, I want gray areas presented one at a time so that I can focus on each without checkbox overhead.
2. As a designer, I want to bail out of the sweep at any point via freeform input so that I control the pace without extra confirmation steps.
3. As a designer, I want gray areas ordered by ambiguity so that the most important ones get resolved first.

## What to Build

Replace the gray area sweep loop in the design skill (Phase 1 Execute, Step 2) with a serial single-select model:

**Current state:** A batched multi-select loop that presents up to 3 gray areas as checkboxes, includes a dedicated "Skip — move to validation" option, and offers "You decide" on follow-up questions. After each batch, re-analyzes and loops.

**Target state:** A serial loop that:

1. Analyzes remaining ambiguity (excluding resolved areas), ranks by ambiguity level
2. If 0 remain, sweep is complete — no confirmation prompt
3. Presents the single most ambiguous gray area via `AskUserQuestion` with `multiSelect: false`
   - Options are relevant resolution choices for that specific gray area (recommendation included)
   - No dedicated "Skip" or "You decide" options — the built-in Other field handles both
   - Annotate with codebase context when relevant
4. If the user's response via Other indicates bail-out (skip, done, move on, etc.), exit the loop immediately
5. Otherwise, resolve the gray area based on the selected option or freeform input
6. Add to session-scoped resolved list
7. Loop back to step 1

**Removed elements:**
- `multiSelect: true` parameter
- "Skip — move to validation" explicit option
- "You decide" explicit option on follow-up questions
- Batch presentation of up to 3 areas

**Preserved elements:**
- Session-scoped resolved list (never re-present)
- Codebase context annotations
- Natural termination when 0 gray areas remain
- Scope guardrail for new capabilities

## Acceptance Criteria

- [ ] Gray areas are presented one at a time via single-select AskUserQuestion
- [ ] No multiSelect: true in the gray area sweep section
- [ ] No dedicated "Skip" option — bail-out is via the Other freeform field
- [ ] No dedicated "You decide" option — delegation is via the Other freeform field
- [ ] Gray areas ordered by ambiguity (most ambiguous first) each iteration
- [ ] Sweep exits immediately when user indicates bail-out via Other
- [ ] Sweep terminates naturally when 0 gray areas remain (no confirmation)
- [ ] Resolved gray areas are never re-presented (session-scoped list maintained)
- [ ] Decision tree walk (Phase 1, Step 1) is unchanged
- [ ] Validate phase and checkpoint phase are unchanged
