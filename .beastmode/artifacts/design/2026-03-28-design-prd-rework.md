# PRD: Reshape /design Phase to Produce PRDs

## Problem Statement

The current /design phase produces a freeform design document through a gray-area-first interview loop. This approach surfaces unclear areas well but doesn't walk the full decision tree — it only visits areas the user selects from batched gray area lists. The output format (Goal, Approach, Component Breakdown, etc.) is custom and doesn't follow industry-standard PRD structure, making it harder to reuse outside the beastmode workflow.

## Solution

Reshape the /design phase into a two-pass interview that produces a PRD using Matt Pocock's template structure:

1. **Decision tree walk** — Walk every branch of the design tree one question at a time, with Claude's recommendation for each. Explore the codebase inline (don't ask what you can read). Research inline when needed (no separate trigger).
2. **Gray area sweep** — Second pass to catch big-picture blind spots the tree walk may have missed. Surfaces the 3 most unclear areas, user multi-selects which to discuss, loop until satisfied.
3. **Module sketch** — Between interview and PRD writing, sketch major modules and look for deep modules (encapsulate complexity behind simple interfaces).
4. **PRD output** — Write the PRD to state file using the standardized template.

## User Stories

1. As a developer, I want the design phase to walk me through every decision one at a time, so that no branch of the design tree gets skipped.
2. As a developer, I want Claude to recommend an answer for each question, so that I can quickly accept good defaults and focus on the decisions that actually matter.
3. As a developer, I want the codebase explored inline during the interview, so that questions answerable from code don't waste my time.
4. As a developer, I want research done inline when needed, so that I don't have to separately trigger a research pass.
5. As a developer, I want a gray area second pass after the tree walk, so that big-picture blind spots get caught even if the tree walk went deep on specific branches.
6. As a developer, I want prior decisions from context/meta docs applied automatically (with optional review), so that settled questions don't get re-asked every session.
7. As a developer, I want a module sketch step that identifies deep modules, so that /plan gets actionable architectural input.
8. As a developer, I want the output to follow a standard PRD template (Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope), so that the document is self-explanatory and reusable.
9. As a developer, I want the validate phase to check PRD section completeness, so that incomplete PRDs don't slip through.
10. As a developer, I want a new gate set that matches the new flow (decision-tree, gray-areas, prior-decisions, prd-approval), so that I can control which parts are interactive vs automatic.
11. As a developer, I want the /design command name unchanged, so that muscle memory and existing docs don't break.

## Implementation Decisions

- **PRD template**: Matt Pocock's structure — Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope, Further Notes
- **Decision list**: Flat Implementation Decisions section, no locked/discretion split in the PRD output
- **Prior decisions gate**: New `design.prior-decisions` gate (default: auto) — loads context/meta docs and applies prior decisions silently unless human opts for review
- **Interview flow**: Two-pass — full decision tree walk first (one Q at a time, Claude recommends), then gray area sweep for big-picture gaps
- **Codebase exploration**: Inline during interview — if a question can be answered by reading code, read code instead of asking
- **Research**: Inline during tree walk — no separate research trigger in prime phase
- **Module sketch**: New step between gray area pass and PRD writing — sketch major modules, identify deep modules testable in isolation
- **Gate set**: Replace old gates with: `design.decision-tree` (human), `design.gray-areas` (human), `design.prior-decisions` (auto), `design.prd-approval` (human)
- **Validate completeness**: Map to PRD sections — Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope all present. Anti-pattern: fewer than 3 user stories
- **Retro**: No changes — reads state artifact generically, PRD is still markdown at same path
- **Skill naming**: Keep `/design`, update SKILL.md description to mention PRD output
- **PRD storage**: State file at `.beastmode/state/design/YYYY-MM-DD-<feature>.md` — state handling reworked separately
- **Prime phase**: Simplified to load context, check prior decisions, go. Express path stays (existing spec/PRD skips to module sketch)

## Testing Decisions

- No automated tests — beastmode is markdown interpreted by Claude Code
- Validation is structural: run the redesigned /design on a real feature and verify PRD completeness
- Verify retro still triggers and walkers still read the state artifact correctly
- Verify gate config changes don't break other phases (plan, implement, validate, release gates are untouched)

## Out of Scope

- State handling rework (separate concern per user)
- GitHub issue creation from PRD (Matt's flow does this, deferred)
- Renaming /design to /prd
- Changes to /plan, /implement, /validate, /release phases
- Changes to retro system

## Further Notes

- The express path (existing spec/PRD input) still works — if user points to an existing document, skip the decision tree and jump to module sketch
- Deep modules concept (from Matt's flow): modules that encapsulate a lot of functionality behind a simple, testable interface that rarely changes. This gives /plan better architectural input than the current component breakdown.
- The prior-decisions gate is a new concept — it closes the loop between retro (which writes to context/meta) and design (which should consume that knowledge without re-asking the user)
