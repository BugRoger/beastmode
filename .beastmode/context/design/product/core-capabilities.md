# Core Capabilities

## Context
Need to define what beastmode actually does — the concrete feature set that distinguishes it from ad-hoc Claude Code usage.

## Decision
Five-phase workflow with 4-step sub-phase anatomy. Collaborative design. Bite-sized planning with wave-ordered file-isolated tasks. Parallel wave execution. Git worktree isolation via external Justfile orchestrator with WorktreeCreate hook. Brownfield discovery with 5-phase init system (skeleton install, inventory, write, retro, synthesize) detecting 17 L2 domains across all phases. Progressive knowledge hierarchy. Self-improving retro. Commit-per-phase with squash-at-release. Session-start hook with version banner. Unified /beastmode command (init, status, ideas subcommands). Deferred ideas capture and reconciliation via design doc walking. Deadpan persona with context-aware greetings. Pipeline orchestration via `/beastmode orchestrate` with CronCreate poll loop, multi-epic parallelism, per-feature agent fan-out, and manifest convergence. Live pipeline dashboard via `beastmode status --watch` with 2-second polling, ANSI full-screen redraw, change highlighting, and watch loop indicator. Optional cmux terminal multiplexer integration for live pipeline visibility with workspace-per-epic surface model, desktop notifications on errors and blocks, automatic cleanup on release, and zero-regression fallback to SDK dispatch. Centralized verbosity-gated logging via `createLogger(verbosity, slug)` factory with four tiers (0-3), `-v` flag stacking across all CLI commands, stderr/stdout stream split, and consistent `HH:MM:SS slug: message` format.

## Rationale
- Each capability addresses a specific pain point in long-running agentic workflows
- Capabilities compose — worktree isolation enables parallel execution, retro enables knowledge hierarchy
- /beastmode command consolidates status and ideas alongside init — single entry point with flat subcommand depth
- Init system bootstraps the full hierarchy in retro-compatible format — unified ALWAYS/NEVER output from day one

## Source
state/design/2026-03-04-beastmode-command.md
state/design/2026-03-02-session-banner.md
state/design/2026-03-05-dynamic-persona-greetings.md
state/design/2026-03-08-deferred-ideas.md
state/design/2026-03-08-init-l2-expansion.md
state/design/2026-03-28-external-orchestrator.md
state/design/2026-03-28-orchestrator.md
state/design/2026-03-28-cmux-integration.md
