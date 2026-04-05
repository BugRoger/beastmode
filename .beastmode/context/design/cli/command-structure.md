## Context
The CLI needs a clear command surface that covers manual phase execution, autonomous pipeline orchestration, and state visibility.

## Decision
Phase as direct argument: `beastmode <phase> <slug>` for single phase execution (no `run` subcommand), `dashboard` for autonomous pipeline orchestration with fullscreen TUI, `cancel <slug>` for full cleanup with `--force` flag for automation, `compact` for standalone context tree compaction (dispatches compaction agent, no worktree needed, always runs regardless of 5-release counter). Design phase exception uses `Bun.spawn` instead of Agent SDK for interactive stdio.

## Rationale
Minimal command surface covers all use cases. Dropping `run` makes the phase name the verb — cleaner ergonomics. Design exception preserves human interaction without forcing Agent SDK workarounds for interactive sessions. Dashboard embeds the watch loop directly — no separate headless watch command needed.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
`.beastmode/artifacts/design/2026-03-28-cli-worktree-management.md`
`.beastmode/artifacts/design/2026-03-31-context-tree-compaction.md`
`.beastmode/artifacts/design/2026-04-02-cancel-cleanup.md`
`.beastmode/artifacts/design/2026-04-05-spring-cleaning.md`
