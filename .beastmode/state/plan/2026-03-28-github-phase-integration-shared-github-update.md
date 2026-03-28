# Shared GitHub Update

**Design:** .beastmode/state/design/2026-03-28-github-phase-integration.md
**Architectural Decisions:** see manifest

## User Stories

8. As a developer, I want GitHub API failures to warn and continue without blocking my workflow, so that network issues never stop me from making progress.

## What to Build

Update the shared GitHub utility module with two changes:

1. **Drop status/review**: Remove the `status/review` label from all references, examples, and operations. The label taxonomy is 3 status labels (ready, in-progress, blocked), not 4.

2. **Add warn-and-continue error handling pattern**: Add a section documenting the error handling contract. Every GitHub API call in checkpoint sync steps should be wrapped in a pattern that catches failures, prints a warning message, and continues execution. The pattern should be documented as a reusable convention that checkpoint steps reference.

The shared utility remains a reference document consumed by phase checkpoints — it is not executable code.

## Acceptance Criteria

- [ ] No references to `status/review` in the shared GitHub utility
- [ ] Error handling pattern documented with clear warn-and-continue convention
- [ ] All existing operations (label, issue, project) remain correct with the 12-label taxonomy
