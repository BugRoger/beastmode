## Context
Development workflow needs to accommodate CLI testing alongside manual skill testing.

## Decision
Plugin testing remains manual (invoke skills and verify). CLI testing via Bun test runner covering: state scanner, merge ordering, worktree manager, config parsing, argument parser. Plugin install via marketplace commands; CLI install via `cd cli && bun install && bun link`.

## Rationale
CLI has enough logic to warrant automated tests. Skills remain thin enough that manual testing suffices.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
