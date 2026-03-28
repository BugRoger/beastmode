## Context
Phase transitions need to move from Justfile recipes as primary entry point to CLI commands, with Justfile retained as alias.

## Decision
`beastmode run <phase> <slug>` is the primary entry point. CLI owns worktree lifecycle and SDK session management. Justfile recipes become thin aliases. Design phase uses `Bun.spawn` for interactive stdio. Watch loop provides automated advancement.

## Rationale
CLI ownership enables typed session management, cost tracking, and worktree lifecycle control that shell-based Justfile recipes cannot provide. Alias layer preserves muscle memory.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
