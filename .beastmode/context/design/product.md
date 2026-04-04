# Product

## Vision and Goals
- ALWAYS design before code — structured phases prevent wasted implementation
- NEVER store context outside `.beastmode/` — single source of truth across sessions
- ALWAYS run retro at release — captures full-cycle learnings that inform future sessions
- Context persists across sessions via `.beastmode/` artifact storage — session continuity
- Self-improvement through context hierarchy — knowledge compounds over time

## Core Capabilities
- ALWAYS follow five-phase order: design -> plan -> implement -> validate -> release — invariant sequence
- NEVER skip sub-phases — prime -> execute -> validate -> checkpoint is invariant
- Each capability documented in its own phase's context domain — discoverability
- Collaborative design — human stays in the loop
- Bite-sized planning with wave-ordered file-isolated tasks — enables parallelism
- Git worktree isolation — prevents main branch contamination
- Progressive knowledge hierarchy from L0 through L3 — right context at right time
- Self-improving retro loop — knowledge compounds
- Squash-per-release commits — clean main history
- Session-start hook with version banner — orientation
- Unified /beastmode skill command (init, ideas) — single entry point with flat subcommands; status moved to CLI (`beastmode status`) with `--watch`/`-w` live dashboard mode for persistent pipeline visibility
- Deferred ideas capture — walks design docs at read time, LLM reconciliation against skill files, strikethrough marking for resolved ideas
- Expanded init system with 5-phase flow (skeleton, inventory, write, retro, synthesize) and 17-domain detection — bootstraps full L2/L3/meta hierarchy in retro-compatible format
- GitHub state externalization with Epic > Feature issue hierarchy, label-based state machines, and project board visibility — enables autonomous daemon operation and human observability
- Pipeline orchestration via `beastmode watch` — TypeScript CLI watch loop drives epics through plan -> release with parallel SDK session dispatching, per-feature implement fan-out, and pre-merge conflict simulation; WatchLoop extends EventEmitter with typed events for subscriber-based consumption
- Fullscreen TUI dashboard via `beastmode dashboard` — Ink v6 + React three-zone layout (header, epic table, activity log) with embedded watch loop, keyboard navigation (arrows, q, x, a), inline epic cancellation with session abort, alternate screen buffer, shared data module with `beastmode status`
- Optional cmux terminal multiplexer integration — live pipeline visibility with workspace-per-epic surface model, desktop notifications on errors/blocks, automatic cleanup on release, zero-regression fallback to SDK dispatch
- Context tree compaction — retro value-add gate prevents redundant L3 creation at source, on-demand compaction agent removes stale L3s, folds restatements, and detects cross-phase duplicates for L0 promotion; runs via `beastmode compact`
- BDD integration test generation via plan-integration-tester agent — plan skill spawns domain-specialist subagent post-decomposition to diff PRD user stories against existing `.feature` files and produce Gherkin integration artifact; warn-and-continue on agent failure

## Differentiators
- Progressive hierarchy uses curated summaries — NEVER use embedding/vector retrieval
- ALWAYS persist context as markdown in `.beastmode/` — human-readable and git-tracked
- ALWAYS present differentiators with equal weight — each is a real differentiator, not padding
- Knowledge compounds through self-improving retro loop — not static docs
- Design-before-code prevents wasted implementation — structure over speed
