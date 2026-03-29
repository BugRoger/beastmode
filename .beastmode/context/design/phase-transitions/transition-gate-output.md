## Context
Checkpoint transition output format needs to reflect the CLI entry point with no `run` subcommand.

## Decision
Checkpoint prints `beastmode <next-phase> <slug>`. No Skill() calls, no auto-chaining. STOP after printing.

## Rationale
Consistent with CLI as sole entry point. Human copies and runs, or watch loop auto-advances — same format works for both paths.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
`.beastmode/artifacts/design/2026-03-28-cli-worktree-management.md`
