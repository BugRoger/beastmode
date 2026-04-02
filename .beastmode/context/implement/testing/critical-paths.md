# Critical Paths

## Context
Certain code paths are high-risk and must be tested before release.

## Decision
Always test brownfield on a real codebase. Always verify parallel agents produce non-conflicting output. Always verify atomic writes. Core scenarios: brownfield execution, parallel agent spawning, content merge, atomic file writes, task-runner integration.

## Rationale
These are the paths most likely to produce silent failures. Brownfield touches real filesystems, parallel agents have race conditions, and atomic writes prevent partial states.

## Source
Source artifact unknown — backfill needed
