# Design Context

## Product
- ALWAYS design before code — structured phases prevent wasted implementation
- NEVER skip the retro sub-phase — it's how the system learns and improves
- Capabilities include: collaborative design, bite-sized planning, parallel wave execution, git worktree isolation via TypeScript CLI orchestrator (`beastmode`), brownfield discovery with 17-domain init system, progressive knowledge hierarchy, self-improving retro, commit-per-phase with squash-at-release, session-start hook, unified /beastmode command (init, ideas subcommands), deferred ideas capture and reconciliation, deadpan persona, manifest-based local state with optional GitHub mirroring for issue-based lifecycle tracking, CLI-owned worktree lifecycle with feature branch detection, pipeline orchestration via `beastmode watch` with event-driven re-scan, multi-epic parallelism, per-feature agent fan-out, `beastmode status` for pipeline state visibility, and optional cmux terminal multiplexer integration for live pipeline visibility with workspace-per-epic surface model

## Architecture
- ALWAYS follow the progressive loading pattern — L0 autoloads, L1 loads at prime, L2 on-demand
- NEVER use @imports between hierarchy levels — convention-based paths only
- Four data domains: Artifacts (committed skill outputs in `artifacts/`), State (gitignored pipeline manifests in `state/`), Context (published knowledge), Meta (process knowledge with process + workarounds domains). Manifest JSON is the operational authority for feature lifecycle via manifest-store.ts (filesystem boundary) and manifest.ts (pure state machine); GitHub is a one-way synced mirror updated by the CLI after every phase dispatch when enabled
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
Manifest JSON is the operational authority for feature lifecycle, located at `.beastmode/state/YYYY-MM-DD-<slug>.manifest.json` (local-only, gitignored). GitHub is a one-way synced mirror updated via sync-on-save in store.save() when github.enabled is true, with re-entrancy guard to prevent write-back loops. Two-level issue hierarchy (Epic > Feature) with label-based state machines using blast-replace for mutually exclusive label families. Only Epics appear on the Projects V2 board. Terminal states (done, cancelled) close all related issues. Skills are fully GitHub-unaware and manifest-unaware — they write artifacts to `artifacts/<phase>/`, a Stop hook generates output.json from frontmatter, and the CLI reads output.json to enrich the manifest. github-sync.ts returns mutations instead of mutating in-place. `beastmode sync` provides manual full-reconciliation with optional `--clean` for zombie cleanup. GitHub API failures warn and continue without blocking.

1. ALWAYS use two-level hierarchy: Epic (capability) > Feature (work unit) with label-based type/phase/status encoding
2. ALWAYS use manifest JSON as operational authority — GitHub is a one-way mirror, CLI never reads GitHub state to update the manifest
3. ALWAYS sync GitHub via sync-on-save in store.save() — every manifest write triggers syncGitHub(manifest, config) when github.enabled is true, with re-entrancy guard to prevent write-back loops; `beastmode sync` provides manual full-reconciliation across all manifests
4. NEVER let GitHub API failures block workflow — warn and continue, next dispatch retries
5. NEVER make skills GitHub-aware or manifest-aware — skills write artifacts with frontmatter only, Stop hook generates output.json, CLI is the sole manifest mutator
6. ALWAYS use 12-label taxonomy: 2 type, 7 phase, 3 status (ready, in-progress, blocked) plus gate/awaiting-approval — status/review is dropped
7. ALWAYS use github.enabled config toggle to control GitHub sync — when false, all GitHub steps are silently skipped
8. ALWAYS use blast-replace for mutually exclusive label families (phase/*, status/*) — remove all labels in family, add correct one, idempotent
9. ALWAYS close all child feature issues when epic reaches terminal state (done or cancelled) — done sets board status "Done", cancelled adds "Cancelled" comment and closes
10. ALWAYS store GitHub project metadata (project-id, project-number, field-id, field-options) in config.yaml under the github: section — no separate cache file, setup-github writes directly
11. ALWAYS auto-detect repo from git remote origin when config.github.repo is not set — detectRepo() parses owner/repo from HTTPS or SSH URLs, caches result in config.yaml

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
TypeScript CLI (`beastmode`) built with Bun and Claude Agent SDK that provides manual phase execution (`beastmode <phase> <slug>`), autonomous pipeline orchestration (`beastmode watch`), and manual GitHub reconciliation (`beastmode sync`). Lives in `cli/` with its own `package.json`, separate from the plugin's markdown skills. Owns worktree lifecycle, manifest lifecycle, and GitHub sync. Manifest logic split into two modules: manifest-store.ts (filesystem boundary — get, list, save, create, validate, with sync-on-save hook) and manifest.ts (pure state machine — enrich, advancePhase, regressPhase, markFeature, cancel, deriveNextAction, checkBlocked, shouldAdvance). GitHub sync triggers inside store.save() rather than post-dispatch — every manifest write syncs when github.enabled is true, with a re-entrancy guard to prevent write-back loops. Post-dispatch still handles output.json reading and manifest enrichment but no longer calls syncGitHub directly. Manifest uses flat-file convention: `.beastmode/state/YYYY-MM-DD-<slug>.manifest.json`, local-only and gitignored. Skills write artifacts to `artifacts/<phase>/` only. Status command redesigned as compact table (Epic | Phase | Features | Status) with --verbose flag. Cost tracking removed from scanner and status. GatesConfig extended with validate phase.

1. ALWAYS use CLI for phase execution, pipeline orchestration, manifest management, and GitHub sync — no Justfile, CLI is the sole entry point
2. ALWAYS use `DispatchedSession` abstraction for phase dispatch — `SdkSession` for SDK `query()`, `CmuxSession` for cmux terminal surfaces, `SessionFactory` selects based on config and runtime
3. ALWAYS own worktree lifecycle in the CLI — create at first phase, persist through phases, squash-merge at release
4. ALWAYS own manifest lifecycle via manifest-store.ts (filesystem) and manifest.ts (pure functions) — store is the sole filesystem accessor, pure functions return new manifests without mutation
5. ALWAYS run post-dispatch pipeline: Stop hook generates output.json from artifact frontmatter, CLI reads it from `artifacts/<phase>/`, enriches manifest via pure functions — sync happens automatically inside store.save(), not as a separate post-dispatch step
6. ALWAYS reuse `.beastmode/config.yaml` with `cli:`, `cmux:`, and `github:` sections — github section stores project-id, project-number, field-id, field-options, and repo (auto-detected from git remote), written by setup-github directly (no separate cache file)
7. ALWAYS use lockfile to prevent duplicate watch instances — single orchestrator guarantee
8. ALWAYS use flat-file manifest path convention — state/YYYY-MM-DD-<slug>.manifest.json, no directory-per-slug
9. ALWAYS use findProjectRoot() in status command — not process.cwd(), works from subdirectories

context/design/cli.md

## State Scanner
Gutted or deleted. Scanning is composed from manifest-store.ts (store.list()) plus manifest.ts pure functions (deriveNextAction(), checkBlocked()). No standalone scanner module. PipelineManifest is the sole manifest type — EpicState, FeatureProgress, ScanResult are deleted. Manifest path: state/YYYY-MM-DD-<slug>.manifest.json (gitignored). Blocked is structured ({ gate, reason } | null), not boolean.

1. ALWAYS compose scanning from store.list() + manifest.deriveNextAction() + manifest.checkBlocked() — no standalone scanner module
2. ALWAYS use PipelineManifest as the sole manifest type — EpicState, FeatureProgress, ScanResult, Manifest are all deleted
3. ALWAYS use manifest path convention state/YYYY-MM-DD-<slug>.manifest.json — gitignored, CLI-owned
4. ALWAYS use structured blocked field ({ gate, reason } | null) — not boolean, enables status display of block reason
5. ALWAYS auto-resolve git merge conflict markers before parsing manifests — take ours-side, strip markers, attempt parse
6. NEVER aggregate costs in the scanner — cost tracking removed from scanner and status entirely

context/design/state-scanner.md

## cmux Integration
Optional terminal multiplexer integration that provides live visibility into the pipeline. When cmux is available and enabled, the watch loop creates cmux workspaces per epic and terminal surfaces per dispatched agent. Communication uses JSON-RPC over Unix socket. Agents run as real terminal processes with interactive capability. Desktop notifications fire on errors and blocked gates only. Surfaces clean up on release, mirroring the worktree lifecycle. cmux is never a hard dependency — the SDK dispatch path is fully preserved as the fallback.

1. ALWAYS use JSON-RPC over Unix socket for cmux communication — `CmuxClient` wraps the protocol
2. ALWAYS create one workspace per epic, one surface per dispatched phase/feature — natural mental model mapping
3. ALWAYS fire notifications only on errors and blocked gates — configurable via `cmux.notifications`
4. ALWAYS clean up cmux surfaces on release — mirrors worktree lifecycle
5. NEVER require cmux — `cmuxAvailable()` check plus `cmux.enabled` config means zero regression risk

context/design/cmux-integration.md
