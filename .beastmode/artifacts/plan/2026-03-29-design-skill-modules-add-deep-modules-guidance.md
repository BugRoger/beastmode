# Add Deep Modules Guidance

**Design:** .beastmode/state/design/2026-03-29-design-skill-modules.md

## User Stories

2. As a planner, I want "deep modules" guidance available during architectural decisions, so that I can apply it with actual codebase context instead of in the abstract.

## What to Build

Add "deep modules" design guidance (from A Philosophy of Software Design) to the plan phase's architectural decisions step. The guidance should be integrated into the existing list of concerns in the "Identify Durable Architectural Decisions" section, encouraging planners to actively look for opportunities to extract deep modules — modules that encapsulate significant functionality behind simple, stable interfaces that rarely change. The guidance should be actionable in the context of having actual codebase visibility, not abstract theory.

## Acceptance Criteria

- [ ] Plan execute phase step 2 contains deep modules guidance
- [ ] Guidance references the concept from A Philosophy of Software Design
- [ ] Guidance is actionable in the context of architectural decisions (not abstract)
