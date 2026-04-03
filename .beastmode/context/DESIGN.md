# Design Context

## Product
- ALWAYS design before code — structured phases prevent wasted implementation
- NEVER skip retro at release — it's the sole mechanism for updating the knowledge hierarchy
- Capabilities include: collaborative design, bite-sized planning, parallel wave execution, git worktree isolation via TypeScript CLI orchestrator (`beastmode`), brownfield discovery with 17-domain init system, progressive knowledge hierarchy, self-improving retro, commit-per-phase with squash-at-release, phase regression/rerun via overloaded `beastmode <phase> <slug>` with CLI-managed git tags (`beastmode/<slug>/<phase>`) as deterministic reset targets and confirmation prompt before destructive reset, session-start hook, unified /beastmode command (init, ideas subcommands), deferred ideas capture and reconciliation, deadpan persona, manifest-based local state with optional GitHub mirroring for issue-based lifecycle tracking, CLI-owned worktree lifecycle with feature branch detection, pipeline orchestration via `beastmode watch` with event-driven re-scan and EventEmitter-based typed events, multi-epic parallelism, per-feature agent fan-out, `beastmode status` for pipeline state visibility with `--watch` live-updating terminal dashboard, fullscreen TUI dashboard via `beastmode dashboard` (Ink v6 + React, k9s-style push/pop drill-down with view stack, live SDK streaming with message mapper and ring buffers, breadcrumb bar, context-sensitive key hints, keyboard navigation, inline epic cancellation, embedded watch loop), and optional cmux terminal multiplexer integration for live pipeline visibility with workspace-per-epic surface model, context tree compaction with retro value-add gate (prevents redundant L3 creation) and on-demand compaction agent (staleness removal, restatement folding, L0 promotion detection) via `beastmode compact`

## Architecture
- ALWAYS follow the progressive loading pattern — L0 autoloads, L1 loads at prime, L2 on-demand
- NEVER use @imports between hierarchy levels — convention-based paths only
- Three data domains: Artifacts (committed skill outputs in `artifacts/`), State (gitignored pipeline manifests in `state/`), Context (published knowledge). Manifest JSON is the operational authority for feature lifecycle via manifest-store.ts (filesystem boundary) and manifest.ts (pure state machine); GitHub is a one-way synced mirror updated by the CLI after every phase dispatch when enabled. Manifest terminology: `slug` is an immutable 6-character hex assigned at worktree creation, `epic` is the human-readable name derived after design phase rename, `feature` is a sub-unit within an epic
- ALWAYS create a matching L3 directory for every L2 file — structural invariant for retro expansion
- State has no L1 index files — only empty phase subdirs with .gitkeep as workflow containers
- research/ lives at .beastmode/ root, not under state/ — reference material is not workflow state
- Sub-phase anatomy is invariant: prime -> execute -> validate -> checkpoint
- Skills MUST detect when already running inside an agent worktree and skip their own worktree creation — prevents double-worktree nesting
- Each SKILL.md is self-contained with inline phase sections — no external imports or blockquote directives
- NEVER write to context/ directly from phases — retro and the compaction agent are the sole gatekeepers
- Retro runs once at release with all phase artifacts — context walker processes the full cycle in a single pass
- Context walker ALWAYS applies value-add gate before creating L3 — skip records that add no rationale, constraints, provenance, or dissenting context beyond the L2 summary

## Release Workflow
- ALWAYS run retro from release checkpoint before merge — retro runs only at release, not per-phase
- Compaction is manual-only via `beastmode compact` — decoupled from the release pipeline
- ALWAYS commit per phase on the feature branch — each phase persists work at checkpoint for cross-session durability
- ALWAYS squash-merge feature branch at release — per-phase commits collapse to one clean commit on main
- ALWAYS archive branch tip before squash merge

## Phase Transitions
TypeScript CLI (`beastmode`) drives phase transitions via `beastmode <phase> <slug>`. Each phase is a separate Claude Agent SDK session. Skills are pure content processors with no worktree or transition logic. Checkpoint prints the `beastmode` command for the next phase. Only the checkpoint may produce next-step commands; retro agents are banned from transition guidance. The watch loop (`beastmode watch`) provides automated advancement: event-driven re-scan on session completion drives epics through plan -> release. Phase regression is supported: `beastmode <phase> <slug>` detects when the requested phase is at or behind the current phase, resets the git branch to the predecessor phase's tag, and reruns via a generic REGRESS event. CLI-managed git tags (`beastmode/<slug>/<phase>`) provide deterministic reset targets. Justfile is deleted — CLI is the sole orchestration entry point.

1. ALWAYS use `beastmode <phase> <slug>` as the phase entry point — no Justfile aliases, CLI is the sole orchestrator
2. NEVER embed worktree or transition logic in skills — skills assume correct working directory
3. ALWAYS print `beastmode <next-phase> <slug>` at checkpoint — human copies and runs (or watch loop auto-advances)
4. NEVER auto-chain phases — each phase is a separate SDK session
5. NEVER print transition guidance from retro agents — checkpoint is the sole authority
6. ALWAYS STOP after printing transition output — no additional output
7. ALWAYS use the phase detection matrix for `beastmode <phase> <slug>` — regression (requested < current), same-phase rerun (requested == current with prior commits), normal forward (requested == current, no prior), forward-jump blocked (requested > current)
8. ALWAYS prompt for confirmation before destructive regression in manual CLI — watch loop skips prompt
9. NEVER allow regression to design phase — plan is the earliest valid regression target
10. ALWAYS use git tags (`beastmode/<slug>/<phase>`) as deterministic reset targets — created at phase checkpoint, deleted on regression, renamed during slug rename

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
Manifest JSON is the operational authority for feature lifecycle, located at `.beastmode/state/YYYY-MM-DD-<slug>.manifest.json` (local-only, gitignored). GitHub is a one-way synced mirror updated by the CLI after every phase dispatch when github.enabled is true. Two-level issue hierarchy (Epic > Feature) with label-based state machines using blast-replace for mutually exclusive label families. Only Epics appear on the Projects V2 board. Skills are fully GitHub-unaware and manifest-unaware — they write artifacts to `artifacts/<phase>/`, a Stop hook generates output.json from frontmatter, and the CLI reads output.json to enrich the manifest and sync GitHub. github-sync.ts returns mutations instead of mutating in-place. GitHub API failures warn and continue without blocking. Manifest schema includes `slug` (immutable hex), optional `epic` (human name after rename), optional `originId` (birth hex for lineage tracking).

1. ALWAYS use two-level hierarchy: Epic (capability) > Feature (work unit) with label-based type/phase/status encoding
2. ALWAYS use manifest JSON as operational authority — GitHub is a one-way mirror, CLI never reads GitHub state to update the manifest
3. ALWAYS sync GitHub after every phase dispatch in the CLI — `syncGitHub(manifest, config)` runs post-dispatch, same code path for manual and watch-loop execution
4. NEVER let GitHub API failures block workflow — warn and continue, next dispatch retries
5. NEVER make skills GitHub-aware or manifest-aware — skills write artifacts with frontmatter only, Stop hook generates output.json, CLI is the sole manifest mutator
6. ALWAYS use 12-label taxonomy: 2 type, 7 phase, 3 status (ready, in-progress, blocked) — status/review is dropped, gate/awaiting-approval removed
7. ALWAYS use github.enabled config toggle to control GitHub sync — when false, all GitHub steps are silently skipped
8. ALWAYS use blast-replace for mutually exclusive label families (phase/*, status/*) — remove all labels in family, add correct one, idempotent

context/design/github-state-model.md

## Pipeline Orchestration
TypeScript CLI watch mode (`beastmode watch`) scans local state files and dispatches agent sessions in CLI-owned worktrees to drive epics through plan -> release in parallel. On validate failure, the watch loop auto-regresses to implement via the generic REGRESS event (no confirmation prompt in automated mode). WatchLoop extends EventEmitter with typed events (`epic:start`, `epic:complete`, `epic:error`, `phase:start`, `phase:complete`, `scan`) enabling multiple consumers (logger subscriber for headless mode, React state hooks for dashboard). Signal handling externalized from WatchLoop — callers (watch command, dashboard) own SIGINT/SIGTERM handling and call `loop.stop()`. Dispatch uses a strategy pattern: `DispatchedSession` interface with `SdkSession` (SDK `query()`) and `CmuxSession` (cmux terminal surface) implementations. A `SessionFactory` selects the strategy based on cmux availability and config. No concurrency cap — API rate limits are the natural governor. Fan-out per feature at implement. Design phase is excluded (interactive). Event-driven re-scan on session completion with 60-second poll as safety net.

1. ALWAYS use manifest files as the authority for orchestration decisions — scanner reads manifest.phase for epic state, not GitHub labels or marker files
2. NEVER orchestrate design phase — interactive by nature, requires human collaboration
3. ALWAYS merge implement worktrees sequentially with pre-merge conflict simulation via `git merge-tree` — optimized merge order
4. ALWAYS use CLI-owned worktrees — CLI creates before, merges after, removes when done
5. ALWAYS use `DispatchedSession` interface for dispatch — `SessionFactory` returns `SdkSession` or `CmuxSession` based on runtime state and config
6. ALWAYS reconcile cmux state on startup — adopt live surfaces, close dead ones, remove empty workspaces

context/design/orchestration.md

## CLI Architecture
TypeScript CLI (`beastmode`) built with Bun and Claude Agent SDK that provides manual phase execution (`beastmode <phase> <slug>`) with phase detection matrix (regression, same-phase rerun, forward, forward-jump blocking), autonomous pipeline orchestration (`beastmode watch`), fullscreen TUI dashboard (`beastmode dashboard`), and standalone context tree compaction (`beastmode compact`). CLI-managed git tags (`beastmode/<slug>/<phase>`) provide deterministic reset targets for phase regression — tags are created at phase checkpoint, deleted on regression, and renamed during slug rename. Lives in `cli/` with its own `package.json`, separate from the plugin's markdown skills. Owns worktree lifecycle, manifest lifecycle, and GitHub sync. Manifest logic split into two modules: manifest-store.ts (filesystem boundary — get, list, save, create, validate, rename, find, slugify) and manifest.ts (pure state machine — enrich, advancePhase, regressPhase, markFeature, cancel, deriveNextAction, shouldAdvance). Slug terminology: `slug` is immutable hex, `epic` is human name, `feature` is sub-unit. `store.rename()` atomically renames all slug-keyed resources (artifacts, branch, worktree, manifest) with prepare-then-execute strategy and deterministic `<epic>-<hex>` collision resolution. `store.find()` resolves by hex or name. Single `store.save()` per dispatch — machine persist action accumulates state in memory only, `store.save()` is a pure write. After every phase dispatch, a Stop hook auto-generates output.json from artifact frontmatter (located by hex slug match), then the CLI enriches the manifest and runs syncGitHub(manifest, config). Non-design phases fail fast if slug not found. `rename-slug.ts`, `resolveDesignSlug()`, and `skipFinalPersist` are deleted. Manifest uses flat-file convention: `.beastmode/state/YYYY-MM-DD-<slug>.manifest.json`, local-only and gitignored. Skills write artifacts to `artifacts/<phase>/` only with standardized frontmatter (`phase`, `slug` hex, `epic` name always present; phase-specific additions per phase). Status data logic (sorting, filtering, snapshot building, change detection) extracted into shared `status-data.ts` module consumed by both `status` and `dashboard` commands. Status command provides compact table (Epic | Phase | Features | Status) with --verbose flag and a `--watch`/`-w` live dashboard mode that polls every 2 seconds, redraws via ANSI escape sequences, highlights changed rows for one cycle, and shows watch loop running state via lockfile detection. Dashboard command provides fullscreen Ink/React TUI with embedded watch loop. Cost tracking removed from scanner and status. Runtime dependencies: `ink` (v6.8.0), `react`, and `chalk` added to cli/package.json for dashboard rendering and structured log formatting.

1. ALWAYS use CLI for phase execution, pipeline orchestration, manifest management, and GitHub sync — no Justfile, CLI is the sole entry point
2. ALWAYS use `DispatchedSession` abstraction for phase dispatch — `SdkSession` for SDK `query()`, `CmuxSession` for cmux terminal surfaces, `SessionFactory` selects based on config and runtime
3. ALWAYS own worktree lifecycle in the CLI — create at first phase, persist through phases, squash-merge at release
4. ALWAYS own manifest lifecycle via manifest-store.ts (filesystem — get, list, save, create, validate, rename, find, slugify) and manifest.ts (pure functions) — store is the sole filesystem accessor, pure functions return new manifests without mutation
5. ALWAYS run post-dispatch pipeline: Stop hook generates output.json from artifact frontmatter, CLI reads it from `artifacts/<phase>/` by hex slug match, enriches manifest via pure functions, optionally calls `store.rename()` for design phase, single `store.save()`, then runs `syncGitHub(manifest, config)`
6. ALWAYS reuse `.beastmode/config.yaml` with `cli:`, `cmux:`, and `github:` sections — github config block extended with project-id, field-id, and option ID mappings written by setup
7. ALWAYS use lockfile to prevent duplicate watch instances — single orchestrator guarantee
8. ALWAYS use flat-file manifest path convention — state/YYYY-MM-DD-<slug>.manifest.json, no directory-per-slug
9. ALWAYS use findProjectRoot() in status command — not process.cwd(), works from subdirectories
10. ALWAYS use polling for status --watch (2-second interval) — no filesystem events, no new dependencies, pure ANSI escape codes over stdout
11. ALWAYS use standardized frontmatter across all phase artifacts — `phase`, `slug` (immutable hex), `epic` (human name) always present; phase-specific additions per phase
12. ALWAYS use single `store.save()` per dispatch — machine persist accumulates state in memory, no disk writes during transitions
13. ALWAYS gate design completion on output.json existence — primary gate in phase.ts cleans up via shared cancel module before post-dispatch; secondary guard in post-dispatch skips DESIGN_COMPLETED if no output exists
14. ALWAYS use the shared cancel module (cancel-logic.ts) for all cancellation paths — CLI cancel, dashboard cancel, and design-abandon all call cancelEpic() with ordered cleanup (worktree, branch, archive tags, phase tags, artifacts, GitHub issue, manifest), warn-and-continue per step, idempotent
15. ALWAYS support --force flag on cancel command — skips confirmation prompt for automated pipelines, extracted via parseForce() in args.ts

context/design/cli.md

## Dashboard
Fullscreen terminal UI (`beastmode dashboard`) built with Ink v6.8.0 + React with k9s-style push/pop drill-down navigation across three views (EpicList, FeatureList, AgentLog) managed as a view stack. Five-zone chrome: header, breadcrumb bar, content area, activity log, key hints bar. Content area renders one view at a time (full-screen replace, not split pane). SDK dispatch is forced at runtime (overriding config) to enable live structured message streaming via async generator iteration. A message mapper converts SDKMessage types to terminal-friendly log entries (text deltas inline, tool calls as one-liners). Ring buffers per session (~100 entries) collect continuously so history is available immediately on navigation. Context-sensitive key hints update per view type. Embedded watch loop via EventEmitter typed events. Signal handling externalized from WatchLoop.

1. ALWAYS use Ink v6 + React for fullscreen TUI rendering — Yoga flexbox handles terminal resize natively
2. ALWAYS use alternate screen buffer for clean entry and exit
3. ALWAYS embed the WatchLoop directly in the dashboard process — no separate watch process needed
4. ALWAYS use WatchLoop EventEmitter typed events for UI state updates — logger and React hooks are parallel subscribers
5. ALWAYS externalize signal handling from WatchLoop — Ink app's SIGINT handler calls `loop.stop()`, no conflicting handlers
6. ALWAYS share data logic (sorting, filtering, change detection) via `status-data.ts` — dashboard and status command use the same pure functions
7. ALWAYS use the same lockfile as `beastmode watch` — mutual exclusion prevents two orchestrators from running simultaneously
8. NEVER replace `beastmode watch` or `beastmode status --watch` — dashboard is an addition, not a replacement
9. ALWAYS use push/pop view stack for drill-down navigation — Enter pushes, Escape pops, three view types (EpicList, FeatureList, AgentLog)
10. ALWAYS force SDK dispatch strategy when dashboard is running — message streams require SDK async generators, not terminal processes
11. ALWAYS allocate a ring buffer per dispatched SDK session — buffers collect continuously for instant history on navigation
12. ALWAYS render context-sensitive key hints per view type — each view exports its own key hint set

context/design/dashboard.md

## State Scanner
Gutted or deleted. Scanning is composed from manifest-store.ts (store.list()) plus manifest.ts pure functions (deriveNextAction()). No standalone scanner module. PipelineManifest is the sole manifest type — EpicState, FeatureProgress, ScanResult are deleted. Manifest path: state/YYYY-MM-DD-<slug>.manifest.json (gitignored). Manifest schema includes `slug` (immutable hex), optional `epic` (human name), optional `originId` (birth hex). Slug format validated via `isValidSlug()`.

1. ALWAYS compose scanning from store.list() + manifest.deriveNextAction() — no standalone scanner module
2. ALWAYS use PipelineManifest as the sole manifest type — EpicState, FeatureProgress, ScanResult, Manifest are all deleted
3. ALWAYS use manifest path convention state/YYYY-MM-DD-<slug>.manifest.json — gitignored, CLI-owned
4. ALWAYS auto-resolve git merge conflict markers before parsing manifests — take ours-side, strip markers, attempt parse
5. NEVER aggregate costs in the scanner — cost tracking removed from scanner and status entirely
6. ALWAYS validate slug format against `[a-z0-9](?:[a-z0-9-]*[a-z0-9])?` via `isValidSlug()` — centralized in manifest-store.ts

context/design/state-scanner.md

## Pipeline Machine
XState v5 state machine module at `cli/src/pipeline-machine/` replacing implicit manifest.ts pure functions with explicit declarative state definitions. Two machines: epic pipeline (design → done/cancelled) and feature status (pending → completed). `setup()` API for type-safe separation of definition from implementation. Sync actions (persist to memory, enrich, rename, regress) on transitions, async services (GitHub sync) as invoked actors. Generic REGRESS event (`{ type: "REGRESS", targetPhase }`) replaces the hardcoded VALIDATE_FAILED transition — guard enforces targetPhase <= currentPhase and targetPhase != "design", actions reset phase, clear features to pending when regressing to or past implement, and clear downstream artifacts. Persist action accumulates state in memory only — no disk writes during machine transitions; single `store.save()` at end of post-dispatch writes final state. State metadata for watch loop dispatch. Same `.manifest.json` format — no migration.

1. ALWAYS define state transitions declaratively in the XState machine — no implicit conditionals in orchestration code
2. ALWAYS use named guards in `setup()` for transition conditions — testable independently from machine
3. ALWAYS use XState actions for sync side effects and invoked services for async operations — ordering guaranteed
4. ALWAYS use state metadata for watch loop dispatch type — machine is the sole dispatch authority
5. ALWAYS persist using same PipelineManifest JSON shape — machine context IS the manifest
6. ALWAYS accumulate state in memory during machine transitions — single `store.save()` at end of dispatch is the sole disk write
7. ALWAYS use generic REGRESS event for all regression scenarios — VALIDATE_FAILED is removed, watch loop sends REGRESS with targetPhase "implement" on validate failure
8. ALWAYS reset all features to pending when REGRESS targets implement or earlier — full-phase regression, no per-feature granularity

context/design/pipeline-machine.md

## cmux Integration
Optional terminal multiplexer integration that provides live visibility into the pipeline. When cmux is available and enabled, the watch loop creates cmux workspaces per epic and terminal surfaces per dispatched agent. Communication uses JSON-RPC over Unix socket. Agents run as real terminal processes with interactive capability. Desktop notifications fire on errors only. Surfaces clean up on release, mirroring the worktree lifecycle. cmux is never a hard dependency — the SDK dispatch path is fully preserved as the fallback.

1. ALWAYS use JSON-RPC over Unix socket for cmux communication — `CmuxClient` wraps the protocol
2. ALWAYS create one workspace per epic, one surface per dispatched phase/feature — natural mental model mapping
3. ALWAYS fire notifications only on errors — configurable via `cmux.notifications`
4. ALWAYS clean up cmux surfaces on release — mirrors worktree lifecycle
5. NEVER require cmux — `cmuxAvailable()` check plus `cmux.enabled` config means zero regression risk

context/design/cmux-integration.md

## Context Tree Compaction
Two mechanisms prevent and clean up L3 bloat: a retro value-add gate that checks proposed L3 records against their parent L2 before creation (must add rationale, constraints, provenance, or dissenting context — otherwise silently skipped), and a compaction agent that audits the existing tree in fixed order (staleness removal, restatement folding, L0 promotion detection). Compaction is a utility agent with no phase lifecycle. Runs on-demand via `beastmode compact`.

1. ALWAYS apply value-add gate in context walker before creating L3 — skip pure restatements of L2
2. Compaction is manual-only via `beastmode compact` — decoupled from release pipeline
3. ALWAYS use fixed compaction order: staleness, restatement, L0 promotion — earlier steps reduce false positives
4. NEVER auto-resolve ambiguous staleness — flag for human review
5. ALWAYS preserve `.gitkeep` in emptied L3 directories — structural invariant

context/design/compaction.md
