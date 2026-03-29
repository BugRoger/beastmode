## Context
Phase transitions need a single CLI entry point. The Justfile is deleted — no alias layer.

## Decision
`beastmode <phase> <slug>` is the sole entry point. The `run` subcommand is dropped. CLI owns worktree lifecycle (create-once, persist, squash-merge at release) and SDK session management. Design phase uses `Bun.spawn` for interactive stdio. Watch loop provides automated advancement.

## Rationale
CLI ownership enables typed session management, cost tracking, and worktree lifecycle control. Dropping the Justfile eliminates indirection. Dropping the `run` subcommand simplifies the command surface — phase name is the verb.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
`.beastmode/artifacts/design/2026-03-28-cli-worktree-management.md`
