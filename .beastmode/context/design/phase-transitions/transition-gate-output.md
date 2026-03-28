## Context
Checkpoint transition output format needs to reflect the new CLI entry point.

## Decision
Checkpoint prints `beastmode run <next-phase> <slug>`. No Skill() calls, no auto-chaining. STOP after printing.

## Rationale
Consistent with CLI as primary entry point. Human copies and runs, or watch loop auto-advances — same format works for both paths.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
