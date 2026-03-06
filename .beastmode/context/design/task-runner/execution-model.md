# Execution Model

## Context
Skills are markdown files with headings and numbered lists. Need a mechanism to parse these into executable task sequences with progress tracking.

## Decision
Parse `## N. Title` headings and numbered lists into hierarchical tasks. Depth-first execution loop: first pending task with completed/in-progress parent executes next. Track progress via TodoWrite with one in_progress task at a time. Max 2 retries per task before blocking.

## Rationale
- Heading-based parsing maps naturally to markdown skill structure
- Depth-first ensures children complete before parent marks done
- TodoWrite integration gives the user visibility into progress

## Source
state/design/2026-03-04-task-runner.md
