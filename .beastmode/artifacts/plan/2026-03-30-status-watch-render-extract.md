---
phase: plan
epic: status-watch
feature: render-extract
---

# Render Extract

**Design:** .beastmode/artifacts/design/2026-03-30-status-watch.md

## User Stories

1. As a pipeline operator, I want to run `beastmode status --watch` so that I can see pipeline state updating in real-time without re-running the command.

## What to Build

Refactor the status command to separate the table-rendering logic from the command entry point. The current `statusCommand` function combines data fetching, row building, table formatting, and console output in a single flow. Extract a pure rendering function that accepts enriched manifests and options, and returns the complete formatted table string. Both the existing one-shot status command and the new watch loop will call this function.

The rendering function should:
- Accept an array of enriched manifests and display options (e.g., `all` flag)
- Perform row building, sorting, and table formatting
- Return the formatted string (not print it directly)
- Keep the existing ANSI color logic, phase ordering, and filtering behavior intact

This is a refactoring feature — no new behavior, just structural separation.

## Acceptance Criteria

- [ ] Table rendering extracted into a function that returns a string instead of printing directly
- [ ] Existing `statusCommand` calls the extracted function and prints the result (behavior unchanged)
- [ ] Existing status tests pass without modification
- [ ] The extracted function is exported and callable by other modules
