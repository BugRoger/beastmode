## Problem Statement

The design phase includes a "module sketch" step (Execute step 3) that asks the user to identify major modules before any codebase exploration has happened. This is a problem-space guess at solution-space structure. The plan phase then redoes this work properly — with actual codebase context — through its explore, architectural decisions, and feature decomposition steps. Worse, the module sketch results aren't even persisted in the PRD: the checkpoint template has no modules section, so the work evaporates between phases.

## Solution

Remove the module sketch step from the design phase entirely. Design stays in problem-space (decisions, gray areas, user stories). Module/structural decomposition belongs in plan, which already handles it with codebase context. Move the "deep modules" design guidance (from A Philosophy of Software Design) to plan's architectural decisions step where it can be applied with actual code visibility.

## User Stories

1. As a designer, I want the design phase to focus on problem-space decisions without premature structural decomposition, so that I don't waste time on module guesses that plan will redo.
2. As a planner, I want "deep modules" guidance available during architectural decisions, so that I can apply it with actual codebase context instead of in the abstract.
3. As a skill maintainer, I want consistent references across design skill files (no dangling module references), so that the skill instructions match actual behavior.

## Implementation Decisions

- Remove Module Sketch (step 3) from `design/phases/1-execute.md`
- Update readiness condition in Execute step 4: "decision tree + gray areas are all resolved" (remove "modules")
- Remove "Modules" block from Executive Summary template in `design/phases/2-validate.md`
- Remove "Modules that will be built/modified" bullet from Implementation Decisions in PRD template (`design/phases/3-checkpoint.md`)
- Remove "Which modules will be tested" bullet from Testing Decisions in PRD template (`design/phases/3-checkpoint.md`)
- Update express path in `design/phases/0-prime.md`: jump to gray areas (Execute step 2) instead of module sketch
- Update `design/SKILL.md` description and phase 1 summary to remove "module sketch" references
- Move "deep modules" guidance to `plan/phases/1-execute.md` step 2 (Identify Durable Architectural Decisions)
- L2 context doc cleanup deferred to retro — skills never write to context/meta directly
- Validate completeness checklist: no changes needed (checks section presence, not module content)

## Testing Decisions

- What makes a good test: verify that design skill files no longer reference module sketch and that plan's architectural decisions step includes deep modules guidance
- Prior art: skill-cleanup PRD (2026-03-06) followed a similar pattern of removing references across skill files

## Out of Scope

- Changing plan phase structure (confirmed: plan is fine as-is)
- Adding a module identification step to plan (existing steps cover it)
- Updating L2 context docs (retro's job)
- Changing the Validate completeness checklist

## Further Notes

None

## Deferred Ideas

None
