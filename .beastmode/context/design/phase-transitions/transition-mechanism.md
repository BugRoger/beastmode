# Transition Mechanism

## Context
Phases need to chain to the next phase. Previously, auto-chaining used Skill() calls from within checkpoints. External orchestration moves this responsibility to a Justfile that invokes `claude --worktree` per phase.

## Decision
Justfile recipes serve as the phase entry point. Each recipe invokes `claude --dangerously-skip-permissions --worktree <slug> "/phase <args>"` interactively. Fresh session per phase — state files are the contract, not conversation history. WorktreeCreate hook detects feature branches: if `feature/<slug>` exists, worktree branches from it; otherwise falls through to origin/HEAD. Design uses auto-generated worktree name; plan+ uses the feature slug.

## Rationale
- External orchestration decouples skills from infrastructure concerns — skills become pure content processors
- Fresh session per phase prevents context degradation across long workflows
- Feature branches as handoff mechanism are more durable than in-memory worktree state
- WorktreeCreate hook bridges Claude Code's native worktree support with beastmode's feature branch model

## Source
state/design/2026-03-28-external-orchestrator.md
