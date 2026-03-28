# Phase Transitions

## Transition Mechanism
- ALWAYS use Justfile recipes as phase entry points — `just <phase> <slug>` invokes `claude --worktree`
- ALWAYS use fresh session per phase — state files are the contract between phases, not conversation history
- NEVER auto-chain phases from within skills — human runs each phase recipe explicitly
- WorktreeCreate hook detects feature branches: if `feature/<slug>` exists, worktree branches from it; otherwise falls through to origin/HEAD
- Worktree directory is `.claude/worktrees/` (Claude Code default) — not `.beastmode/worktrees/`
- Design uses auto-generated worktree name (new feature); plan+ uses feature slug

## Phase-to-Skill Mapping
design -> plan -> implement -> validate -> release. Each transition gate is namespaced: `transitions.design-to-plan`, `transitions.plan-to-implement`, etc.

1. ALWAYS follow the five-phase order — no skipping phases

## Transition Gate Output
Checkpoint prints the Justfile command for the next phase. Format: `just <next-phase> <slug>`. No Skill() calls, no auto-chaining. STOP after printing — no additional output.

1. ALWAYS print `just <next-phase> <slug>` at checkpoint — human copies and runs
2. ALWAYS STOP after transition output — no additional output follows the checkpoint
3. NEVER produce Skill() calls from checkpoint — external orchestrator handles invocation

## Guidance Authority
Only the transition gate in the checkpoint phase may produce next-step commands. Retro agents and sub-agents are banned from printing transition guidance, session-restart instructions, or next-step commands.

1. NEVER print next-step commands from retro agents — transition gate is the sole authority
