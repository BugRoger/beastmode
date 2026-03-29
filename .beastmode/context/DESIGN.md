# Design Context

## Product
- ALWAYS design before code — structured phases prevent wasted implementation
- NEVER skip the retro sub-phase — it's how the system learns and improves
- Capabilities include: collaborative design, bite-sized planning, parallel wave execution, git worktree isolation via TypeScript CLI orchestrator (`beastmode`), brownfield discovery with 17-domain init system, progressive knowledge hierarchy, self-improving retro, commit-per-phase with squash-at-release, session-start hook, unified /beastmode command (init, ideas subcommands), deferred ideas capture and reconciliation, deadpan persona, manifest-based local state with optional GitHub mirroring for issue-based lifecycle tracking, CLI-owned worktree lifecycle with feature branch detection, pipeline orchestration via `beastmode watch` with event-driven re-scan, multi-epic parallelism, per-feature agent fan-out, `beastmode status` for pipeline state visibility, and optional cmux terminal multiplexer integration for live pipeline visibility with workspace-per-epic surface model

## Architecture
- ALWAYS follow the progressive loading pattern — L0 autoloads, L1 loads at prime, L2 on-demand
- NEVER use @imports between hierarchy levels — convention-based paths only
- Three data domains: State (feature workflow), Context (published knowledge), Meta (process knowledge with process + workarounds domains). Manifest JSON is the operational authority for feature lifecycle; GitHub is a one-way synced mirror updated by the CLI after every phase dispatch when enabled
- ALWAYS create a matching L3 directory for every L2 file — structural invariant for retro expansion
- State has no L1 index files — only empty phase subdirs with .gitkeep as workflow containers
- research/ lives at .beastmode/ root, not under state/ — reference material is not workflow state
- Sub-phase anatomy is invariant: prime -> execute -> validate -> checkpoint
- Skills MUST detect when already running inside an agent worktree and skip their own worktree creation — prevents double-worktree nesting
- NEVER write to context/ or meta/ directly from phases — retro is the sole gatekeeper
- Retro reconciliation is artifact-scoped — quick-check L1 first, deep-check L2 only when stale
- Meta walker mirrors context walker algorithm — L1 quick-check, L2 deep-check, L3 record management with confidence-gated promotion
- NEVER skip retro — walkers handle empty phases gracefully, no quick-exit gating

## Task Runner
- ALWAYS track tasks via TodoWrite — one in_progress at a time
- NEVER expand linked files eagerly — lazy expansion on first visit only
- Gate steps (`## N. [GATE|...]`) are structural — cannot be bypassed

## Release Workflow
- ALWAYS run retro from checkpoint before merge — consistent across all five phases
- ALWAYS commit per phase on the feature branch — each phase persists work at checkpoint for cross-session durability
- ALWAYS squash-merge feature branch at release — per-phase commits collapse to one clean commit on main
- ALWAYS archive branch tip before squash merge

## Phase Transitions
TypeScript CLI (`beastmode`) drives phase transitions via `beastmode <phase> <slug>`. Each phase is a separate Claude Agent SDK session. Skills are pure content processors with no worktree or transition logic. Checkpoint prints the `beastmode` command for the next phase. Only the checkpoint may produce next-step commands; retro agents are banned from transition guidance. The watch loop (`beastmode watch`) provides automated advancement: event-driven re-scan on session completion drives epics through plan -> release. Justfile is deleted — CLI is the sole orchestration entry point.

1. ALWAYS use `beastmode <phase> <slug>` as the phase entry point — no Justfile aliases, CLI is the sole orchestrator
2. NEVER embed worktree or transition logic in skills — skills assume correct working directory
3. ALWAYS print `beastmode <next-phase> <slug>` at checkpoint — human copies and runs (or watch loop auto-advances)
4. NEVER auto-chain phases — each phase is a separate SDK session
5. NEVER print transition guidance from retro agents — checkpoint is the sole authority
6. ALWAYS STOP after printing transition output — no additional output

## Tech Stack
- Skills remain dependency-free markdown interpreted by Claude Code — no runtime dependencies in the plugin
- CLI (`cli/`) is a separate package with its own `package.json` — Bun runtime, Claude Agent SDK, independent dependency story
- ALWAYS use markdown + YAML frontmatter for skill definitions
- Plugin distribution via Claude Code marketplace; CLI distribution via `bun link`

## Init System
5-phase bootstrapping system (skeleton, inventory, write, retro, synthesize) that detects 17 L2 domains and produces retro-compatible output. Writers and retros run in parallel. Greenfield mode installs skeleton only.

1. ALWAYS follow 5-phase init order: skeleton install -> inventory -> write -> retro -> synthesize
2. ALWAYS produce ALWAYS/NEVER format in L2 and Context/Decision/Rationale in L3 — unified with retro output
3. NEVER include beastmode-specific domains in skeleton — retro creates those
4. ALWAYS run retro pass after writers even on empty state/ — no conditional gating

context/design/init-system.md

## GitHub State Model
Manifest JSON is the operational authority for feature lifecycle, located at `.beastmode/pipeline/<slug>/manifest.json` (local-only, gitignored). GitHub is a one-way synced mirror updated by the CLI after every phase dispatch when github.enabled is true. Two-level issue hierarchy (Epic > Feature) with label-based state machines using blast-replace for mutually exclusive label families. Only Epics appear on the Projects V2 board. Skills are fully GitHub-unaware and manifest-unaware — they write structured output files to `state/`, and the CLI reads those outputs to update the manifest and sync GitHub. GitHub API failures warn and continue without blocking.

1. ALWAYS use two-level hierarchy: Epic (capability) > Feature (work unit) with label-based type/phase/status encoding
2. ALWAYS use manifest JSON as operational authority — GitHub is a one-way mirror, CLI never reads GitHub state to update the manifest
3. ALWAYS sync GitHub after every phase dispatch in the CLI — `syncGitHub(manifest, config)` runs post-dispatch, same code path for manual and watch-loop execution
4. NEVER let GitHub API failures block workflow — warn and continue, next dispatch retries
5. NEVER make skills GitHub-aware or manifest-aware — skills write phase output files only, CLI is the sole manifest mutator
6. ALWAYS use 12-label taxonomy: 2 type, 7 phase, 3 status (ready, in-progress, blocked) plus gate/awaiting-approval — status/review is dropped
7. ALWAYS use github.enabled config toggle to control GitHub sync — when false, all GitHub steps are silently skipped
8. ALWAYS use blast-replace for mutually exclusive label families (phase/*, status/*) — remove all labels in family, add correct one, idempotent

context/design/github-state-model.md

## Pipeline Orchestration
TypeScript CLI watch mode (`beastmode watch`) scans local state files and dispatches agent sessions in CLI-owned worktrees to drive epics through plan -> release in parallel. Dispatch uses a strategy pattern: `DispatchedSession` interface with `SdkSession` (SDK `query()`) and `CmuxSession` (cmux terminal surface) implementations. A `SessionFactory` selects the strategy based on cmux availability and config. No concurrency cap — API rate limits are the natural governor. Fan-out per feature at implement. Design phase is excluded (interactive). Respects config.yaml gates, pauses epic and logs to stdout on human gates. Event-driven re-scan on session completion with 60-second poll as safety net.

1. ALWAYS use manifest files as the authority for orchestration decisions — scanner reads manifest.phase for epic state, not GitHub labels or marker files
2. NEVER orchestrate design phase — interactive by nature, requires human collaboration
3. ALWAYS merge implement worktrees sequentially with pre-merge conflict simulation via `git merge-tree` — optimized merge order
4. ALWAYS respect config.yaml gate settings — human gates pause the epic and log to stdout, user runs `beastmode <phase> <slug>` manually to proceed
5. ALWAYS use CLI-owned worktrees — CLI creates before, merges after, removes when done
6. ALWAYS use `DispatchedSession` interface for dispatch — `SessionFactory` returns `SdkSession` or `CmuxSession` based on runtime state and config
7. ALWAYS reconcile cmux state on startup — adopt live surfaces, close dead ones, remove empty workspaces

context/design/orchestration.md

## CLI Architecture
TypeScript CLI (`beastmode`) built with Bun and Claude Agent SDK that provides manual phase execution (`beastmode <phase> <slug>`) and autonomous pipeline orchestration (`beastmode watch`). Lives in `cli/` with its own `package.json`, separate from the plugin's markdown skills. Owns worktree lifecycle, manifest lifecycle, and GitHub sync. After every phase dispatch, the CLI reads the phase output from the worktree, updates the manifest (advance phase, record artifacts, update feature statuses), then runs `syncGitHub(manifest, config)`. Manifest uses flat-file convention: `.beastmode/pipeline/YYYY-MM-DD-<slug>.manifest.json`, local-only and gitignored. Status command redesigned as compact table (Epic | Phase | Features | Status) with --verbose flag for diagnostic visibility. Cost tracking removed from scanner and status. GatesConfig extended with validate phase.

1. ALWAYS use CLI for phase execution, pipeline orchestration, manifest management, and GitHub sync — no Justfile, CLI is the sole entry point
2. ALWAYS use `DispatchedSession` abstraction for phase dispatch — `SdkSession` for SDK `query()`, `CmuxSession` for cmux terminal surfaces, `SessionFactory` selects based on config and runtime
3. ALWAYS own worktree lifecycle in the CLI — create at first phase, persist through phases, squash-merge at release
4. ALWAYS own manifest lifecycle in the CLI — create at first dispatch, enrich from phase outputs at each checkpoint, CLI is the sole mutator
5. ALWAYS run post-dispatch pipeline: read phase output from worktree `state/`, update manifest, run `syncGitHub(manifest, config)`
6. ALWAYS reuse `.beastmode/config.yaml` with `cli:`, `cmux:`, and `github:` sections — github config block extended with project-id, field-id, and option ID mappings written by setup
7. ALWAYS use lockfile to prevent duplicate watch instances — single orchestrator guarantee
8. ALWAYS use flat-file manifest path convention — pipeline/YYYY-MM-DD-<slug>.manifest.json, no directory-per-slug
9. ALWAYS use findProjectRoot() in status command — not process.cwd(), works from subdirectories

context/design/cli.md

## State Scanner
Single canonical state scanner (state-scanner.ts) that reads manifest files from the pipeline directory and reports epic state to the orchestrator. Read-only — never writes to the filesystem. Phase is read from a top-level manifest.phase field, replacing marker files and the manifest.phases map. Shared manifest validation schema (used by both scanner and reconciler) enforces required fields: phase, design, features, lastUpdated. Strict validation rejects manifests missing required fields — skipped silently unless --verbose. Single EpicState type lives in state-scanner.ts; watch-types.ts is deleted. Flat-file manifest path convention (pipeline/YYYY-MM-DD-<slug>.manifest.json). Auto-resolves git merge conflict markers. Uses reactive gate blocking. Blocked is a single boolean field collapsing blocked/gateBlocked/blockedGate/gateName.

1. ALWAYS use state-scanner.ts as the single canonical scanner — no inline scanner, no fallback implementations
2. ALWAYS read phase from top-level manifest.phase field — no inference from markers, features, or phases map
3. ALWAYS use shared manifest validation schema for both scanner reads and reconciler writes — required fields: phase, design, features, lastUpdated
4. ALWAYS strictly reject manifests missing required fields — skip entirely, visible only with --verbose
5. ALWAYS use single EpicState type in state-scanner.ts — delete watch-types.ts, watch command imports from scanner
6. ALWAYS use flat-file manifest path convention — pipeline/YYYY-MM-DD-<slug>.manifest.json, no directory-per-slug
7. ALWAYS auto-resolve git merge conflict markers before parsing manifests — take ours-side, strip markers, attempt parse
8. ALWAYS use reactive gate blocking with single blocked boolean — collapses blocked/gateBlocked/blockedGate/gateName
9. NEVER let the scanner write to the filesystem — read-only, reconciler is the sole writer
10. NEVER aggregate costs in the scanner — cost tracking removed from scanner and status entirely

context/design/state-scanner.md

## cmux Integration
Optional terminal multiplexer integration that provides live visibility into the pipeline. When cmux is available and enabled, the watch loop creates cmux workspaces per epic and terminal surfaces per dispatched agent. Communication uses JSON-RPC over Unix socket. Agents run as real terminal processes with interactive capability. Desktop notifications fire on errors and blocked gates only. Surfaces clean up on release, mirroring the worktree lifecycle. cmux is never a hard dependency — the SDK dispatch path is fully preserved as the fallback.

1. ALWAYS use JSON-RPC over Unix socket for cmux communication — `CmuxClient` wraps the protocol
2. ALWAYS create one workspace per epic, one surface per dispatched phase/feature — natural mental model mapping
3. ALWAYS fire notifications only on errors and blocked gates — configurable via `cmux.notifications`
4. ALWAYS clean up cmux surfaces on release — mirrors worktree lifecycle
5. NEVER require cmux — `cmuxAvailable()` check plus `cmux.enabled` config means zero regression risk

context/design/cmux-integration.md
