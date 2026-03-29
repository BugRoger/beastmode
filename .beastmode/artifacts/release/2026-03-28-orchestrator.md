# Release: orchestrator

**Version:** v0.25.1
**Date:** 2026-03-28

## Highlights

Orchestrator design artifacts and architectural context documentation. PRD for the autonomous pipeline orchestrator with L2/L3 knowledge hierarchy docs covering execution model, agent spawning, team organization, gate handling, manifest convergence, and lifecycle.

## Docs

- **Orchestrator PRD** — Design doc specifying CronCreate-based poll loop, worktree-isolated agents, per-epic team organization, and manifest convergence for autonomous multi-epic pipeline execution
- **Orchestration L2 context** — New `context/design/orchestration.md` summarizing orchestration domain rules (local-first state, worktree isolation, config.yaml gates)
- **6 L3 orchestration records** — Architectural decision records for agent-spawning, execution-model, gate-handling, lifecycle, manifest-convergence, and team-organization
- **Design context updates** — Architecture, phase-transitions, and product context docs updated with orchestration references

## Fixes

- **Stale worktree cleanup** — Removed accidentally staged `.claude/worktrees/` directory

## Full Changelog

- `31a5727` design(orchestrator): checkpoint
- `f018de5` Merge worktree-declarative-drifting-beaver: design(orchestrator)
- `46d8b1d` fix: remove accidentally staged worktree
