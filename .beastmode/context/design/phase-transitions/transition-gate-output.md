# Transition Gate Output

## Context
Phase checkpoints need to tell the human what to run next. Previously used inline code commands with `/beastmode:<next-phase>` syntax. External orchestration replaces this with Justfile commands.

## Decision
Checkpoint prints `just <next-phase> <slug>` as the sole transition output. No Skill() calls, no auto-chaining. STOP after printing — no additional output. Retro agents remain banned from producing transition guidance.

## Rationale
- `just` command is copy-pasteable and self-documenting — human knows exactly what to run
- Single output source eliminates the duplicate guidance problem (retro, context report, gate all printing commands)
- STOP instruction prevents output that buries the command
- Consistent format across all five phases reduces cognitive load

## Source
state/design/2026-03-08-phase-end-guidance.md
state/design/2026-03-28-external-orchestrator.md
