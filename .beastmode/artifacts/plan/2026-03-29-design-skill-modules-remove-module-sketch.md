# Remove Module Sketch

**Design:** .beastmode/state/design/2026-03-29-design-skill-modules.md

## User Stories

1. As a designer, I want the design phase to focus on problem-space decisions without premature structural decomposition, so that I don't waste time on module guesses that plan will redo.
3. As a skill maintainer, I want consistent references across design skill files (no dangling module references), so that the skill instructions match actual behavior.

## What to Build

Remove the Module Sketch step (step 3) from the design execute phase and clean up all references to it across design skill files. Specifically:

- Remove step 3 (Module Sketch) from the execute phase, renumber the remaining step
- Update the readiness condition in the execute phase's "Iterate Until Ready" step to reference only "decision tree + gray areas" (remove "modules")
- Remove the "Modules" block from the Executive Summary template in the validate phase
- Remove the "Modules that will be built/modified" bullet from the Implementation Decisions section of the PRD template in the checkpoint phase
- Remove the "Which modules will be tested" bullet from the Testing Decisions section of the PRD template in the checkpoint phase
- Update the express path in the prime phase to jump to gray areas instead of module sketch
- Update SKILL.md description and phase 1 summary line to remove "module sketch" references

## Acceptance Criteria

- [ ] No reference to "module sketch" or "Module Sketch" exists in any design skill file
- [ ] Express path in 0-prime.md references gray areas, not module sketch
- [ ] Executive summary in 2-validate.md has no "Modules" section
- [ ] PRD template in 3-checkpoint.md has no module-related bullets
- [ ] SKILL.md description and phase summary have no module sketch references
- [ ] Step numbering in 1-execute.md is consecutive after removal
