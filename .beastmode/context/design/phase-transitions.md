# Phase Transitions

## Transition Mechanism
- ALWAYS use `beastmode <phase> <slug>` as the phase entry point — CLI owns worktree lifecycle and SDK session management
- Justfile is deleted — CLI is the sole orchestration entry point, no alias layer
- ALWAYS use fresh SDK session per phase — state files are the contract between phases, not conversation history
- NEVER auto-chain phases from within skills — human runs each command explicitly (or watch loop auto-advances)
- CLI-owned worktree lifecycle: creates worktree at first phase encounter, persists through all phases, squash-merges to main and removes at release
- Worktree directory is `.claude/worktrees/` (Claude Code default) — not `.beastmode/worktrees/`
- Design uses `Bun.spawn` with inherited stdio for interactive Claude (not SDK) — design requires human interaction
- Watch loop (`beastmode watch`) provides automated advancement: event-driven re-scan on session completion drives epics through plan -> release

## Phase-to-Skill Mapping
design -> plan -> implement -> validate -> release. Each transition gate is namespaced: `transitions.design-to-plan`, `transitions.plan-to-implement`, etc.

1. ALWAYS follow the five-phase order — no skipping phases

## Transition Gate Output
Checkpoint prints the CLI command for the next phase. Format: `beastmode <next-phase> <slug>`. No Skill() calls, no auto-chaining. STOP after printing — no additional output.

1. ALWAYS print `beastmode <next-phase> <slug>` at checkpoint — human copies and runs
2. ALWAYS STOP after transition output — no additional output follows the checkpoint
3. NEVER produce Skill() calls from checkpoint — CLI handles invocation

## Guidance Authority
Only the transition gate in the checkpoint phase may produce next-step commands. Retro agents and sub-agents are banned from printing transition guidance, session-restart instructions, or next-step commands.

1. NEVER print next-step commands from retro agents — transition gate is the sole authority
