# Release: cmux-integration

**Version:** v0.27.0
**Date:** 2026-03-28

## Highlights

Three design PRDs for the next generation of beastmode pipeline tooling: cmux terminal multiplexer integration for live agent visibility, CLI worktree management for automated branch lifecycle, and GitHub CLI migration to replace raw API calls with `gh` commands. Also includes the epics-only board model and orchestrator architecture revert.

## Docs

- **cmux integration PRD** — Unix socket JSON-RPC client, workspace-per-epic surface model, strategy pattern dispatch abstraction, optional dependency with zero regression risk
- **CLI worktree management PRD** — Automated worktree creation, branch lifecycle, and cleanup for the beastmode CLI orchestrator
- **GitHub CLI migration PRD** — Replace raw GraphQL/REST API calls with `gh` CLI commands across all shared GitHub utilities
- **L2 context: cmux-integration** — 5 new L2 context docs (communication-protocol, lifecycle, notifications, optionality, surface-model)

## Chores

- **Epics-only board model** — Removed `gh project item-add` calls for Feature issues; only Epics added to Projects V2 board
- **Orchestrator revert** — Reverted TypeScript CLI orchestrator (v0.25.0) in favor of Justfile + CronCreate architecture
- **Orchestrator PRD** — CronCreate-based poll loop design with worktree-isolated agents and manifest convergence

## Full Changelog

- `98b8682` design(cmux-integration): checkpoint
- `fcc8a31` design(cli-worktree-management): checkpoint
- `494fa15` design(github-cli-migration): checkpoint
