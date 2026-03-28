# Release: external-orchestrator

**Version:** v0.26.0
**Date:** 2026-03-28

## Highlights

Reverses the v0.25.0 TypeScript CLI pipeline experiment and re-establishes through a full design process that the Justfile is the canonical orchestrator. The TypeScript CLI (5,300+ lines) is removed; skills remain pure content processors.

## Features

- **External orchestrator PRD** — Full design document formalizing Justfile as canonical orchestrator with phase-per-session model, commit-per-phase strategy, and WorktreeCreate hook for smart branch detection
- **Orchestration context refresh** — Updated context docs for agent-spawning, manifest-convergence, team-organization, execution-model, and lifecycle to reflect Justfile-only model

## Chores

- **Remove TypeScript CLI pipeline** — Deleted entire `cli/` directory (pipeline orchestrator, watch loop, merge coordinator, state scanner, worktree manager, and all tests)
- **Remove CLI context docs** — Deleted `context/design/cli/` hierarchy (command-structure, configuration, cost-tracking, recovery-model, sdk-integration, worktree-lifecycle)
- **Remove pipeline orchestrator artifacts** — Deleted design/plan/validate state files for `typescript-pipeline-orchestrator`

## Full Changelog

- `31a5727` design(orchestrator): checkpoint
- `46d8b1d` fix: remove accidentally staged worktree
- Removed 5,309 lines of TypeScript CLI code and related artifacts
- Updated 8 context docs to reflect Justfile-based orchestration model
