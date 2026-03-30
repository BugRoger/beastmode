# Changelog

All notable changes to beastmode.

---

### v0.46.0 — Status Watch (Mar 2026)

- **Live watch mode** — `beastmode status --watch` / `-w` turns the one-shot status command into a live-updating terminal dashboard that polls manifest state every 2 seconds
- **Change highlighting** — Rows that transitioned since last poll render with bold/inverse for one cycle, then revert
- **Dashboard header** — Shows watch loop running indicator (lockfile-based detection) and blocked gate details per epic
- **Render refactor** — Extracted status table rendering into a reusable pure function, separated render logic from command handler
- **Pipeline fixes** — Fixed GitHub sync race conditions, feature isolation in dispatch fan-out, YAML parser quote stripping, cmux session feature-specific output detection, and epic-scoped output provenance

### v0.45.0 — GitHub No For Real Sync (Mar 2026)

- **Reconciling factory** — Extract state reconciliation and release teardown from `dispatchPhase` into `ReconcilingFactory`, eliminating duplication between SDK and cmux paths
- **Cmux dispatch strategy** — `watchCommand` reads `dispatch-strategy` from config, wires `CmuxSessionFactory` when cmux is available with graceful fallback
- **Output.json scan-all** — Stop hook scans ALL artifact .md files with frontmatter instead of only the most recent; uses mtime comparison for efficiency
- **Epic-level worktrees** — `dispatchPhase` always uses epic-level worktree slug, removing per-feature worktree creation
- **Implement checkpoint wording** — Clarify "Next:" handoff message

### v0.44.3 — Slim Down Design (Mar 2026)

- **Remove prior-decisions gate** — Deleted `[GATE|design.prior-decisions]` from design prime phase; design interviews now start without accumulated rules biasing the conversation
- **Config cleanup** — Removed `prior-decisions: auto` from `gates.design` in config.yaml
- **Step renumbering** — Renumbered prime phase steps (4 -> 3, 5 -> 4) for contiguous ordering

### v0.44.2 — README & ROADMAP Accuracy Fix (Mar 2026)

- **Config example fix** — README config.yaml example now shows real gate names; removed deleted `transitions:` block
- **Domain description fix** — Corrected domain list to three: Artifacts, Context, Meta
- **"What Beastmode Is NOT" section** — Added positioning section after "Why?" to clarify scope
- **ROADMAP "Now" update** — Added CLI orchestrator, cmux integration, GitHub state model, terminal phase states, manifest split, demo recording
- **ROADMAP cleanup** — Removed shipped/deleted items (phase auto-chaining, visual language spec); updated "Next"/"Later" to reflect current state

### v0.44.1 — README & ROADMAP Accuracy Fix (Mar 2026)

- **Config example fix** — README config.yaml example now shows real gate names; removed deleted `transitions:` block
- **Domain description fix** — Corrected domain list to three: Artifacts, Context, Meta
- **"What Beastmode Is NOT" section** — Added positioning section after "Why?" to clarify scope
- **ROADMAP "Now" update** — Added CLI orchestrator, cmux integration, GitHub state model, terminal phase states, manifest split, demo recording
- **ROADMAP cleanup** — Removed shipped/deleted items (phase auto-chaining, visual language spec); updated "Next"/"Later" to reflect current state

### v0.44.0 — Terminal Phase States (Mar 2026)

- **Terminal phases** — `done` and `cancelled` added as first-class Phase values; `shouldAdvance` returns `"done"` for completed releases, `deriveNextAction` returns null for both terminal phases
- **Type-safe cancel** — `cancel()` no longer needs `as Phase` cast; `"cancelled"` is a valid Phase
- **GitHub Done sync** — `PHASE_TO_BOARD_STATUS` maps `done` to "Done" column; epic issues auto-close on completion
- **Status filtering** — `buildStatusRows` hides done/cancelled epics by default; `--all` flag shows full history
- **Phase styling** — `colorPhase` green+dim for done, red+dim for cancelled; PHASE_ORDER positions done below active work
- **Scanner reconciliation** — Pre-reconcile worktree outputs in scanner to prevent stale data; preserve manifests after release

### v0.43.0 — Orchestrator State Reconciliation (Mar 2026)

- **Orchestrator-driven state reconciliation** — Watch loop reconciles state by scanning worktree plan files directly instead of parsing output.json; the orchestrator is the sole writer of pipeline state
- **Explicit phase advancement map** — `NEXT_PHASE` constant map replaces ad-hoc phase transition logic
- **Plan reconciliation** — Scans worktree for feature plan `.md` files and enriches the manifest automatically
- **Artifact copying** — Copies plan files from worktree to git-tracked `artifacts/plan/` for downstream agents
- **Dead code removal** — Removed `findWorktreeOutputFile`, `loadWorktreePhaseOutput`, `shouldAdvance`/`regressPhase` imports, stale release re-dispatch test, and unused manifest-store exports

### v0.42.1 — Polling Behaviour (Mar 2026)

- **Async dispatch mutex design** — PRD for promise-based async mutex serializing concurrent `tick()` and `rescanEpic()` calls in the watch loop, closing a check-then-act race condition
- **Dispatch mutex plan** — Feature plan for global async mutex in `WatchLoop` with acquire/release semantics and wait-queue contention model
- **Concurrent dispatch test plan** — Feature plan for CI test proving mutex serialization: simultaneous `tick()` + `rescanEpic()` asserts exactly one `sessionFactory.create()` call
- **Housekeeping** — Removed stale `.beastmode-runs.json`, added to `.gitignore`, fixed plugin update scope in release skill

### v0.42.0 — Manifest File Management (Mar 2026)

- **Pure manifest state machine** — Split `manifest.ts` into pure state transitions and new `manifest-store.ts` filesystem boundary; pipeline logic is fully testable without disk IO
- **Consumer migration** — All CLI modules (watch, status, cancel, phase, github-sync, reconcile-startup, post-dispatch) rewritten against new manifest API
- **Directory restructure** — Historical state artifacts moved from `.beastmode/state/` to `.beastmode/artifacts/`; pipeline manifests live in `.beastmode/pipeline/`
- **Stop hook** — Graceful agent termination via `.claude/settings.json` hook; agents can be stopped mid-phase without corruption
- **Structured blocked state** — `blocked` field upgraded from boolean to `{ gate, reason } | null` with full context
- **Phase regression** — `regressPhase()` allows stepping backward on validate failure instead of manual restart
- **EnrichedManifest type** — Replaces legacy `EpicState`, `FeatureProgress`, `SkippedManifest` with single canonical type
- **Skill checkpoint contracts** — Implement tasks write `.output.json` files for downstream phase consumption
- **Release worktree ops** — `archive()` and `merge()` exports restored in `worktree.ts` for release teardown
- **Immutable github-sync** — Returns mutations instead of mutating manifest in-place
- **Release version deferral** — Version bumping moved to post-merge checkpoint on main; worktree no longer touches version files

### v0.41.0 — The Status Unfuckery, Part II (Mar 2026)

- **Pipeline-only discovery** — Scanner reads pipeline/ manifests exclusively; design-file discovery removed, dropping ~118 zombie epics from status output
- **Manifest.phase authority** — Phase derivation reads `manifest.phase` directly; missing/invalid phase causes strict reject (manifest skipped)
- **Shared manifest validation schema** — TypeScript validator used by both scanner (read) and reconciler (write); required fields: phase, design, features, lastUpdated
- **Single EpicState type** — Canonical interface in state-scanner.ts; watch-types.ts duplicate deleted
- **Unified blocked field** — Single `blocked: boolean` replaces gateBlocked/blockedGate/gateName
- **Compact status table** — Redesigned: Epic | Phase | Features (done/total) | Status with color output
- **--verbose flag** — Surfaces skipped manifests and validation errors
- **Feature status validation** — Rejects unknown status values instead of casting any string
- **Cost tracking removed** — costUsd, aggregateCost, readRunLog removed from scanner and status
- **Test suite rewrite** — 362 tests, 728 assertions across 20 files

### v0.40.0 — The Great Unbundling (Mar 2026)

- **Merge coordinator deleted** — Removed `merge-coordinator.ts` (328 lines) and all associated types, functions, and tests; CLI no longer drives git merges
- **Worktree ops stripped** — Removed `merge()` and `archive()` from `worktree.ts`; module reduced to create, enter, ensureWorktree, exists, remove
- **Watch fan-out simplified** — Implement fan-out dispatches all feature sessions to the same epic worktree instead of creating per-feature branches
- **Release/cancel teardown** — Release calls `removeWorktree()` only (no archive, no merge); cancel skips archive step entirely

### v0.39.0 — The Problem-Space Purification (Mar 2026)

- **Module sketch removal** — Removed Execute step 3 (module sketch) from design phase; design stays in problem-space (decisions, gray areas, user stories) without premature structural decomposition
- **Deep modules guidance** — Moved "deep modules" guidance (from A Philosophy of Software Design) to plan phase's architectural decisions step where it applies with actual codebase context
- **Reference cleanup** — Removed all module-related references from design SKILL.md, express path, executive summary template, and PRD template

### v0.38.0 — The Skill Cleanup (Mar 2026)

- **Checkpoint sync removal** — Removed orphaned "Sync GitHub" sections and `@../_shared/github.md` imports from all 5 checkpoint files; skills no longer reference the deleted shared GitHub utility
- **Status subcommand deletion** — Deleted `skills/beastmode/subcommands/status.md` and removed routing/help text from SKILL.md (status moved to CLI in v0.32.0)
- **Context doc update** — DESIGN.md GitHub State Model section updated to reflect skills are no longer GitHub-aware at checkpoint time

### v0.37.0 — The Fork Point (Mar 2026)

- **Fork-point tracking** — Worktrees fork from local main instead of stale `origin/HEAD`; fork-point SHA recorded in `WorktreeInfo` for audit trail
- **Main branch resolution** — `resolveMainBranch()` resolves default branch from `git symbolic-ref` with `"main"` fallback
- **Graceful degradation** — `forkPoint` set to `undefined` when `merge-base` fails (unrelated histories, missing branch)

### v0.36.0 — The Terminal Multiplexer (Mar 2026)

- **SessionStrategy interface** — Formal strategy pattern (`dispatch()`, `isComplete()`, `cleanup()`) with `SdkStrategy` and `CmuxStrategy` implementations
- **CmuxClient** — Typed CLI wrapper for the `cmux` binary with `--json` flag: `ping()`, `newWorkspace()`, `newSplit()`, `sendSurface()`, `closeSurface()`, `listWorkspaces()`, `notify()`
- **CmuxStrategy** — Workspace-per-epic surface model with `fs.watch` completion detection via `.dispatch-done.json` marker files
- **SessionFactory** — Strategy selection based on `cli.dispatch-strategy` config (`sdk | cmux | auto`) and runtime cmux availability
- **Startup reconciliation** — Adopts live cmux surfaces, closes dead ones, removes empty workspaces on watch restart
- **Surface cleanup** — Automatic workspace teardown when epic reaches release
- **Universal completion marker** — `phaseCommand` writes `.dispatch-done.json` regardless of dispatch method
- **Desktop notifications** — Error and blocked gate notifications via `cmux notify`
- **220 tests passing** — Full test coverage across all new modules

### v0.35.0 — The Status Unfuckery (Mar 2026)

- **Manifest structural validation** — Scanner validates required fields (design, features, lastUpdated) with correct types; malformed manifests skipped with warning instead of corrupting status output
- **Output.json phase detection** — Phase derivation uses checkpoint output.json files instead of legacy directory artifact scanning; waterfall: release > validate > implement-done > implement > plan > design
- **Watch command cleanup** — Removed seedPipelineState (stale manifest re-seeding) and dead scanEpicsInline fallback; watch loop imports state-scanner directly

### v0.34.0 — The Manifest-Only Status (Mar 2026)

- **Manifest-first scanner** — Epic discovery pivots on manifest files instead of design files; status table drops from ~116 noisy rows to ~12 active epics
- **Status cleanup** — Removed Cost column, readRunLog, formatCost; table simplified to 5 columns (Epic, Phase, Progress, Blocked, Last Activity)
- **Watch convergence** — Deleted scanEpicsInline() from watch-command.ts; watch loop delegates to canonical state-scanner.scanEpics()

### v0.33.0 — The Interactive Terminal (Mar 2026)

- **Interactive runner** — All five manual phase commands spawn interactive `claude` CLI sessions with inherited stdio; operators get a live terminal for every phase
- **Phase dispatch unification** — `phaseCommand()` simplified from ~270 lines with fan-out logic to uniform interactive dispatch; implement is no longer a special case

### v0.32.0 — The GitHub CLI Migration (Mar 2026)

- **Manifest redesign** — Pipeline manifest restructured as pure state: single epic, top-level phase, feature statuses, artifact refs; CLI is sole mutator
- **Phase output contract** — Skills write structured `.output.json` files to `state/<phase>/` at checkpoint; universal schema consumed by CLI to advance pipeline state
- **GitHub sync engine** — Stateless `syncGitHub(manifest, config)` runs post-dispatch; one-way mirror from manifest to GitHub with blast-replace labels and warn-and-continue error handling
- **Dispatch pipeline** — CLI reads phase outputs from worktree after dispatch, updates manifest, then syncs GitHub
- **Skill cleanup** — Deleted `skills/_shared/github.md`, removed GitHub sync from 5 checkpoint files and implement prime; skills are now fully GitHub-unaware and manifest-unaware

### v0.31.0 — The Worktree Transaction (Mar 2026)

- **CLI worktree lifecycle** — `ensureWorktree()` creates or reuses a single worktree per epic; all phases share it via cwd injection
- **Cancel command** — `beastmode cancel <slug>` archives branch tip, removes worktree, deletes local branch, updates manifest, closes GitHub epic
- **Skill worktree sweep** — Removed worktree references from ~16 skill files; skills receive feature slug as argument, never touch worktree internals
- **Justfile and hook deletion** — Deleted `Justfile`, `hooks/worktree-create.sh`, `skills/_shared/worktree-manager.md`; removed `WorktreeCreate` from `hooks/hooks.json`
- **Implement fan-out flattened** — Parallel SDK sessions share the epic worktree directly; no per-feature worktrees or merge-coordinator involvement

### v0.30.0 — The Bulletproof Scanner (Mar 2026)

- **Canonical scanner rewrite** — Single `state-scanner.ts` replaces divergent `scanEpicsInline()` in watch-command.ts; manifests are the sole epic anchor, no design file fallback
- **Manifest phase field** — Top-level `manifest.phase` (plan|implement|validate|release|released) replaces marker files and the `phases` map as the single source of truth for epic phase
- **Merge conflict auto-resolution** — Ours-side resolution strips git conflict markers before JSON.parse, preventing silent phase regressions from parallel worktree merges
- **Slug collision detection** — Warns on stderr when multiple manifests resolve to the same slug; uses newest manifest (last sorted by filename)
- **Graceful empty state** — Missing or empty pipeline directories return an empty array instead of crashing
- **Scanner test suite** — Comprehensive unit tests covering every phase transition, conflict resolution, slug collision, empty state, and blocked feature detection (124 tests)

### v0.29.0 — The Terminal Multiplexer (Mar 2026)

- **Dispatch abstraction** — `DispatchedSession` interface with `SdkSession` and `CmuxSession` implementations, `SessionFactory` for runtime strategy selection
- **CmuxSession implementation** — Workspace-per-epic surface model, Unix socket JSON-RPC client, lifecycle management (create workspace, create surface, send command, cleanup)
- **Validation** — 124 tests, 0 failures, clean type check

### v0.28.0 — The Worktree Takeover (Mar 2026)

- **Phase command** — `beastmode <phase> <slug>` replaces `beastmode run` and `just <phase>` as the sole entry point for phase execution
- **Worktree lifecycle** — CLI owns full lifecycle: create-once at first phase, persist through all phases, squash-merge to main and remove at release
- **Manifest module** — New `cli/src/manifest.ts` reads and manages pipeline manifests from worktrees
- **Implement fan-out** — Per-feature worktrees with `<epic>-<feature>` slug; merge-coordinator handles conflict simulation and optimal merge ordering
- **Release teardown** — CLI squash-merges epic branch to main, archives branch tip, removes worktree
- **Watch command alignment** — Watch loop uses same worktree lifecycle as manual execution, ensuring identical behavior

### v0.27.0 — The Design Trifecta (Mar 2026)

- **cmux integration PRD** — Unix socket JSON-RPC client, workspace-per-epic surface model, strategy pattern dispatch abstraction, optional dependency with zero regression risk
- **CLI worktree management PRD** — Automated worktree creation, branch lifecycle, and cleanup for the beastmode CLI orchestrator
- **GitHub CLI migration PRD** — Replace raw GraphQL/REST API calls with `gh` CLI commands across all shared GitHub utilities
- **L2 context: cmux-integration** — 5 new L2 context docs (communication-protocol, lifecycle, notifications, optionality, surface-model)
- **Epics-only board model** — Removed `gh project item-add` calls for Feature issues; only Epics added to Projects V2 board
- **Orchestrator revert** — Reverted TypeScript CLI orchestrator (v0.25.0) in favor of Justfile + CronCreate architecture
- **Orchestrator PRD** — CronCreate-based poll loop, worktree-isolated agents, per-epic teams, manifest convergence

### v0.25.0 — The TypeScript Pipeline (Mar 2026)

- **TypeScript CLI orchestrator** — `beastmode` CLI built with Bun and Claude Agent SDK for phase execution and pipeline orchestration (reverted in v0.27.0)

### v0.24.0 — The Epics-Only Board (Mar 2026)

- **Epics-only board model** — Removed `gh project item-add` calls for Feature issues from plan checkpoint, implement prime, and implement checkpoint; only Epics are added to the Projects V2 board
- **Existing feature cleanup** — Removed all existing Feature issues from the project board via `deleteProjectV2Item` GraphQL mutation (one-time ad-hoc cleanup)
- **Context doc updates** — `github-state-model.md` gains NEVER rule for Feature board-add; `DESIGN.md` summary updated to reflect epics-only model

### v0.23.0 — The Project Board (Mar 2026)

- **Pipeline status field** — Setup-github creates a 7-option Pipeline field (Backlog, Design, Plan, Implement, Validate, Release, Done) with color-coded statuses via GraphQL
- **Project metadata cache** — Setup-github writes `.beastmode/state/github-project.cache.json` with project ID, field ID, and option ID map for downstream checkpoint use
- **Issue backfill** — Setup-github adds all existing `type/epic` and `type/feature` issues to the project with Status derived from their current labels
- **Shared project sync** — New "Add to Project + Set Status" operation in `_shared/github.md` handles idempotent project item addition and status updates
- **Checkpoint project sync** — All 5 phase checkpoints sync Epic and Feature issues to the project board at every transition
- **Cache field name fix** — Fixed `pipelineField` vs `statusField` naming inconsistency between cache writer and reader

### v0.22.0 — The External Orchestrator (Mar 2026)

- **Justfile orchestrator** — Thin CLI shell with recipes for each phase (`just design`, `just plan`, `just implement`, `just validate`, `just release`). Invokes `claude --worktree` interactively.
- **WorktreeCreate hook** — Smart branch detection: if `feature/<slug>` exists, branch from it; otherwise default `origin/HEAD` behavior
- **Skill purification** — Removed all worktree creation/entry/assertion logic and phase transition gates from every skill. Skills are now pure content processors.
- **Checkpoint handoff** — All 5 phase checkpoints print `just <next-phase> <slug>` instead of auto-chaining via `Skill()` calls
- **Commit-per-phase** — Each phase commits to the feature branch at checkpoint. Release squash-merges to main.
- **Config cleanup** — Removed `transitions` section from `.beastmode/config.yaml`

### v0.21.0 — The GitHub Phase Integration (Mar 2026)

- **Manifest-based state tracking** — JSON manifest created at design checkpoint, enriched at plan (features array + architectural decisions), updated at implement (feature status transitions). Local authority for feature lifecycle.
- **GitHub sync at checkpoints** — Optional "Sync GitHub" step in all 5 phase checkpoints creates/advances/closes Epic and Feature issues at checkpoint boundaries. Gated on `github.enabled` config toggle.
- **Setup subcommand update** — `/beastmode setup-github` now creates 12 labels (dropped status/review), Projects V2 board, and writes `github.enabled: true` to config
- **Warn-and-continue error handling** — All GitHub API calls wrapped in try/catch pattern: print warning, skip sync, continue with local state. Workflow never blocked by GitHub.
- **Status rewrite** — `/beastmode status` reads manifests from worktrees, shows per-feature status (pending/in-progress/blocked/completed) with GitHub issue links when enabled
- **Config extension** — New `github.enabled` (default: false) and `github.project-name` keys in `.beastmode/config.yaml`
- **Shared GitHub utility update** — Added error handling convention section and set-status-label operation to `_shared/github.md`

### v0.20.0 — The Feature Decomposition (Mar 2026)

- **PRD-to-features** — /plan now decomposes PRDs into independent architectural feature plans (vertical slices) instead of monolithic implementation plans
- **Feature manifest** — New manifest JSON tracks feature status, architectural decisions, and PRD link across all features in a design
- **Task decomposition moves to /implement** — Detailed wave/task breakdown now happens at implement time, not plan time, giving /implement full autonomy over execution strategy
- **Baseline-aware spec checks** — Implement tracks a baseline snapshot at prime to prevent false positives when features share a worktree
- **Manifest-gated validation** — /validate checks all features are completed via manifest before proceeding
- **Two-tier plan approval** — New `feature-set-approval` (human) and `feature-approval` (auto) gates replace the old single `plan-approval`
- **Feature format template** — New reference template for architectural feature plans: user stories, what to build, acceptance criteria (no file paths, no code)

### v0.19.0 — The PRD Pivot (Mar 2026)

- **Decision tree interviews** — /design now walks every branch of the design tree one question at a time with Claude's recommendation, replacing the old gray-area-first batch loop
- **Two-pass flow** — Full decision tree walk first, then gray area sweep as a second pass to catch big-picture blind spots the tree missed
- **Inline exploration** — Codebase reads and research happen during the interview instead of requiring separate triggers in prime
- **Module sketch step** — New step between interview and PRD writing identifies deep modules (encapsulate complexity behind simple testable interfaces)
- **Prior decisions gate** — New `design.prior-decisions` gate (default: auto) applies context/meta decisions silently so settled questions don't get re-asked
- **PRD output format** — Design artifacts now follow standardized PRD template: Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope, Further Notes, Deferred Ideas
- **New gate set** — Replaced 4 old design gates (intent-discussion, approach-selection, section-review, design-approval) with 4 new ones (decision-tree, gray-areas, prior-decisions, prd-approval)

### v0.18.0 — The GitHub State Model (Mar 2026)

- **GitHub state model** — Two-level issue hierarchy (Epic > Feature) with label-based state machines, externalizing workflow lifecycle to GitHub Issues and Projects V2
- **Shared GitHub utility** — Reusable API operations for auth, labels, issues, sub-issues, and Projects V2
- **Setup subcommand** — `/beastmode setup-github` bootstraps labels, project board, columns, repo linking (idempotent)
- **Config extension** — backlog-to-design and release-to-done transitions, github.project-name setting

### v0.17.0 — The Full Spectrum Init (Mar 2026)

- **17-domain skeleton** — Skeleton assets expanded from 7 to 17 L2 files covering design (4), plan (4), implement (3), validate (2), release (4), each with matching L3 directories and `.gitkeep`
- **Inventory agent expansion** — Detects all 17 domains with specific detection signals for 10 new domains (domain-model, error-handling, workflow, build, quality-gates, validation-patterns, versioning, changelog, deployment, distribution)
- **Writer agent retro-format** — L2 output switched from prose paragraphs to ALWAYS/NEVER bullets with em-dash rationale; L3 records use Context/Decision/Rationale format matching retro agents
- **Init retro phase** — New phase spawns retro-context agents (one per phase) after writers complete, processing state/ artifacts and populating meta/ files
- **Synthesize agent expansion** — Generates all 10 L1 files (5 context + 5 meta) instead of only context; meta L1 format mirrors context L1
- **5-phase init flow** — Init restructured from 3 phases (inventory → populate → synthesize) to 5 (skeleton → inventory → write → retro → synthesize)

### v0.16.0 — The Discovery Engine (Mar 2026)

- **Init system redesigned** — Replaced 5 narrow init agents + greenfield wizard with 3-phase layered discovery: Inventory (orchestrator reads all project knowledge) → Populate (parallel writers create L2 summaries + L3 records) → Synthesize (generates L1 summaries, rewrites CLAUDE.md)
- **Knowledge map architecture** — Inventory agent reads 7 source types (CLAUDE.md, README, docs, plans, source structure, git history, config files) and produces structured knowledge map with L2 topic assignments
- **L3 record creation** — Writer agents create L3 decision records with source attribution from all discoverable sources
- **Dynamic topic discovery** — Proposes new L2 topics when 3+ items cluster beyond the 6 base topics
- **Greenfield mode removed** — Empty projects get skeleton only and evolve through /design sessions

### v0.15.0 — The Hook Fix (Mar 2026)

- **Hook field removed from plugin.json** — The `hooks` reference to `./hooks/hooks.json` caused plugin loading issues; removed to restore correct behavior

### v0.14.38 — The Spring Cleaning (Mar 2026)

- **First-class init agents** — 5 init-* agents made self-contained with `@common-instructions.md` import; dispatched via registered `beastmode:init-*` types instead of manual prompt assembly
- **common-instructions.md relocated** — Moved from `skills/beastmode/references/discovery-agents/` to `agents/`
- **Brownfield dispatch simplified** — `init.md` prompt assembly + concatenation replaced with direct registered agent dispatch
- **Dead reference docs removed** — Deleted `gate-check.md` and `transition-check.md` (both "Reference Only — NOT @imported")

### v0.14.37 — The Gate Tightener (Mar 2026)

- **Structural HARD-GATE enforcement** — Worktree entry/creation sections wrapped in `<HARD-GATE>` tags with numbered procedure bullets, replacing verbose prose enforcement
- **Design worktree placement** — Worktree creation moved from design/1-execute to design/3-checkpoint (step 0), matching the phase's actual needs
- **Prime-first worktree entry** — plan/implement/validate/release enter worktree as step 1 of 0-prime, before announce or context load
- **Bare assert pattern** — validate/release 1-execute slimmed to one-line worktree-manager assert calls
- **Redundant prose removal** — Eliminated "MANDATORY", "no exceptions", "lightweight" enforcement language; gate tags handle enforcement

### v0.14.36 — The Great Deletion (Mar 2026)

- **Context window handling removed** — Deleted `context-report.md`, `visual-language.md`, and all phase indicator / context report references from prime and checkpoint phases
- **Context bridge removed** — Deleted `context-bridge-hook.sh`, `context-bridge-statusline.sh`, and PostToolUse hook from `hooks.json`
- **Auto-transitions simplified** — All auto transition gates now chain unconditionally via `Skill()` calls; no more threshold estimation or low-context fallback
- **Knowledge hierarchy updated** — L1/L2 context docs cleaned of stale threshold, context report, and context bridge references
- **Config simplified** — Removed `context_threshold` from `config.yaml` and `BEASTMODE.md` phase indicator reference

### v0.14.35 — The Context Bridge (Mar 2026)

- **Statusline context persistence** — New `context-bridge-statusline.sh` writes real context window metrics (used%, remaining%, window size) to `/tmp/beastmode-{session_id}.json` per session
- **PostToolUse context injection** — New `context-bridge-hook.sh` reads persisted metrics and injects raw context data as `additionalContext`, replacing estimation with ground truth
- **Plugin-managed hooks** — New `hooks/hooks.json` declares SessionStart and PostToolUse hooks with `${CLAUDE_PLUGIN_ROOT}` portable paths; migrated from project settings to plugin manifest
- **Settings cleanup** — Removed hook declarations from `.claude/settings.local.json` (now plugin-managed via `plugin.json` hooks field)

### v0.14.34 — The Task-Runner Enforcer (Mar 2026)

- **Tightened HARD-GATE contract** — All 5 skill HARD-GATE blocks now require TodoWrite as the first tool call, making task-runner execution verifiable
- **Anti-freestyle enforcement** — "Do not output anything else first" prevents agents from skipping the framework and running sessions conversationally
- **Anti-rationalization line** — "Do not skip this for simple tasks" preempts the "this is too lightweight" excuse
- **Init skeleton restructured** — Init assets now match evolved reality: BEASTMODE.md, config.yaml, research/, full L3 directory tree with .gitkeep
- **PRODUCT.md → context/design/product.md** — Root-level product file moved to proper hierarchy position
- **State simplified** — No more L1 state files; just 5 phase subdirs with .gitkeep
- **Meta L2 templates** — All 5 phases get process.md + workarounds.md + L3 record directories
- **Reality cleanup** — research/ moved from state/ to root, obsolete DESIGN.md deleted, meta L2 bullets migrated to ALWAYS/NEVER format

### v0.14.33 — The Hierarchy Gates (Mar 2026)

- **Hierarchy-aligned retro gates** — Four gates match the knowledge hierarchy: `retro.records` (L3), `retro.context` (L2), `retro.phase` (L1), `retro.beastmode` (L0)
- **Bottom-up gate ordering** — Gates fire L3 → L0, approving lower levels before higher ones
- **Parallel walker spawning** — Context and meta walkers launch simultaneously, outputs merged by hierarchy level before gating
- **Unified L0 gating** — `release.beastmode-md-approval` absorbed into `retro.beastmode`, available to any phase
- **Explicit L1 gating** — L1 summary recomputation and promotions gated through `retro.phase` instead of being a silent side-effect

### v0.14.32 — The Worktree Enforcer (Mar 2026)

- **HARD-GATE worktree enforcement** — `<HARD-GATE>` blocks before worktree steps in all 5 phase files prevent Claude from rationalizing "lightweight" exceptions
- **L0 worktree rule** — BEASTMODE.md Workflow section includes `NEVER skip worktree creation` as a prime directive
- **Assert Worktree anti-rationalization** — worktree-manager.md documents the known failure mode where Claude skips worktree creation for "documentation-only" tasks

### v0.14.31 — The Docs Refresh (Mar 2026)

- **ROADMAP sync** — Added 8 shipped features to "Now" section; updated Progressive Autonomy Stage 3 to reference native Claude Code team support
- **Stale reference fixes** — Fixed L0 line count in progressive-hierarchy.md (~80 → ~40), removed `--brownfield` flag from retro-loop.md and ROADMAP.md

### v0.14.29 — The Deferred Ideas (Mar 2026)

- **Unified /beastmode command** — Single entry point with `init`, `status`, `ideas` subcommands; flat depth, no flags
- **Phase-grouped status** — `/beastmode status` shows active features grouped by workflow phase with worktree detection
- **Deferred ideas capture** — `/beastmode ideas` walks design docs, reconciles against skill files via semantic matching, marks implemented items with strikethrough
- **Auto-detect init mode** — `init` auto-selects greenfield/brownfield based on project state
- **Auto-install on init** — `init` installs `.beastmode/` skeleton automatically if missing
- **Feature name arguments** — Phase transitions use feature names (`/plan deferred-ideas`) instead of file paths, eliminating cross-session worktree discovery failures
- **Resolve Artifact** — New worktree-manager section for convention-based artifact discovery inside worktrees
- Removed standalone `/status` skill and `install` subcommand

### v0.14.28 — The Conversational Design (Mar 2026)

- **Conversational intent flow** — Design execute phase collapsed from 8 steps to 5, replacing batch-question mechanics with one-question-at-a-time conversational flow
- **On-demand codebase reading** — Scout step merged into intent understanding; code is read as questions arise rather than upfront
- **Gray area batches of 3** — Users multi-select from 3 most unclear areas with "Claude's Discretion" bucket, loop until satisfied
- **Approach-selection gate** — New `design.approach-selection` gate separates approach choice from gray area discussion
- **Scope guardrail** — Out-of-scope suggestions captured as deferred ideas, not lost
- **Gate rename** — `gray-area-selection` + `gray-area-discussion` replaced by `intent-discussion` + `approach-selection`

### v0.14.27 — The One True Next Step (Mar 2026)

- **Next Step spec** — Added "Next Step" visual language element with strict rendering rules (inline code only, single authority)
- **Transition gate standardization** — All 4 checkpoint files (design, plan, implement, validate) use identical format for next-step output
- **Retro guidance ban** — `retro.md` explicitly banned from printing transition guidance
- **Context report separation** — `context-report.md` no longer bleeds transition instructions; only describes context state
- **Auto mode prefix** — Low-context auto transitions use `Start a new session and run:` prefix

### v0.14.26 — The Readable Retro (Mar 2026)

- **Context changes template** — Retro context section uses `~`/`+` prefixes with actual content bullets instead of opaque one-liners
- **Meta review inline** — L2 edits shown with literal before/after content instead of count-heavy summary block
- **Records template** — L3 records use `>>`/`+` prefixes with one-sentence summaries, domain and confidence tags
- **Promotions template** — Shows actual ALWAYS/NEVER rules being promoted with `^` prefix and basis

### v0.14.25 — The Worktree Alignment Lock (Mar 2026)

- **Centralized feature naming** — Single `Derive Feature Name` section in worktree-manager.md ensures worktree directory names and artifact filenames always match 1:1
- **Assert Worktree guard** — pwd-based check in worktree-manager.md prevents `.beastmode/` writes outside a worktree; called by all 5 checkpoint phases, retro, and release pre-merge
- **Retro agent path injection** — Context Walker and Meta Walker receive absolute `worktree_root` path, eliminating relative-path drift
- **Release two-phase split** — Explicit TRANSITION BOUNDARY separates pre-merge (worktree) from post-merge (main) operations
- **Shared worktree operations** — All 0-prime phases reference Discover Feature + Enter Worktree from worktree-manager.md instead of inline logic

### v0.14.24 — The Hierarchy Format v2 (Mar 2026)

- **L0 bullet conversion** — BEASTMODE.md converted to pure bullet format under `##` section headers
- **L1 bullet conversion** — All 10 L1 files (5 Context + 5 Meta) stripped of prose paragraphs, rules converted to dash bullets
- **L2 bullet conversion** — All 27 L2 files converted to bullets with em dash rationale
- **Format parity** — Meta and Context domains now use identical structure at L1 and L2
- **L3 unchanged** — Record format preserved; 2 new observations appended during design retro


### v0.14.23 — The Retro Always Runs (Mar 2026)

- **Quick-exit removal** — Removed subjective quick-exit check from `retro.md`; retro always runs, agents handle empty phases gracefully
- **Release phase normalization** — Moved retro from execute (step 8.5) to checkpoint (step 1), consistent with all other phases
- **Release checkpoint expansion** — Checkpoint now owns: retro, squash merge, commit, tag, marketplace update
- **Release execute truncation** — Execute ends at step 8 (L0 proposal prep); steps 8.5-12 moved to checkpoint


### v0.14.22 — The Visual Language Lockdown (Mar 2026)

- **Strict rendering spec** — Rewrites `visual-language.md` from descriptive guide to prescriptive specification with parameterized rules tables
- **Enforcement warnings** — "DO NOT" directives on every visual element (phase indicator, context bar, handoff text)
- **Bad/good examples** — Common violations catalogued alongside correct output for pattern-matching anchors
- **Literal handoff text** — Three exact strings, no paraphrasing allowed


### v0.14.21 — The Meta Hierarchy Tightening (Mar 2026)

- **Domain rename** — `insights.md` → `process.md`, `upstream.md` → `workarounds.md` across all 5 phases
- **Directory rename** — `insights/` → `process/`, `upstream/` → `workarounds/` for all L3 record directories
- **L1 reformat** — All 5 meta L1 files now use `## Process` / `## Workarounds` sections with inlined rules (mirrors Context L1 format)
- **L2 reformat** — All 10 meta L2 files restructured with `##` sections per L3 topic (mirrors Context L2 format)
- **Retro agent update** — `retro-meta.md` updated to target new domain names and output format
- **Context/skill vocabulary** — Architecture docs and `skills/_shared/retro.md` updated from insights/upstream to process/workarounds


### v0.14.20 — The Docs Consistency Audit (Mar 2026)

- **Domain count fix** — README updated from "four domains" to three (Product merged into Context at v0.14.0)
- **Retro terminology abstraction** — retro-loop.md and README replaced Learnings/SOPs/Overrides taxonomy with confidence-based findings/procedures language
- **Meta path fix** — progressive-hierarchy.md meta domain example updated to valid `meta/DESIGN.md` path
- **Gate coverage** — configurable-gates.md now mentions retro and release gates with config.yaml pointer
- **Roadmap sync** — Moved auto-chaining, confidence promotion, checkpoint restart to Now; removed stale /compact reference


### v0.14.19 — The Meta Retro Rework (Mar 2026)

- **Meta hierarchy rebuild** — Replaced flat sops.md/overrides.md/learnings.md with L1/L2/L3 progressive knowledge hierarchy mirroring the context walker
- **Meta walker rewrite** — 6-step algorithm: Session Extraction, L1 Quick-Check, L2 Deep Check, L3 Record Management, Promotion Check, Emit Changes
- **Confidence-gated promotion** — [LOW] -> [MEDIUM] -> [HIGH] -> L1 Procedure with frequency thresholds
- **Two L2 domains** — insights (process patterns) + upstream (beastmode feedback), both promotable to L1 Procedures
- **Gate consolidation** — retro.learnings/retro.sops/retro.overrides replaced by retro.records + retro.promotions
- **Full migration** — All 5 phases migrated: 17 L3 insight records, 3 L3 upstream records, 4 L1 Procedures


### v0.14.18 — The Agent Extraction Audit (Mar 2026)

- **Agent centralization** — Moved 6 agent prompts from skill-local `references/` dirs into `agents/` with `{phase}-{role}.md` naming
- **Dead code removal** — Deleted `agents/discovery.md`, replaced by 5 specialized init agents
- **Researcher rename** — `agents/researcher.md` → `agents/common-researcher.md` following `common-{role}` convention
- **Missing reference fix** — Plan prime now references `common-researcher.md` (was missing entirely)
- **Import path updates** — All 5 affected skill files updated to new agent locations


### v0.14.17 — The Visual Language v2 (Mar 2026)

- **Handoff guidance restored** — Added missing handoff guidance thresholds to visual-language.md
- **Context report tightened** — Explicit "single code block" and "after the code block" rendering instructions in context-report.md


### v0.14.16 — The Split-Brain Fix (Mar 2026)

- **Context report authority cleanup** — Eliminated duplication between visual-language.md and context-report.md; each file now has clear ownership boundaries
- **Handoff guidance moved** — Thresholds and guidance text now owned exclusively by context-report.md
- **Rendering contradiction fixed** — Removed conflicting "code block" vs "plain text" instructions


### v0.14.15 — The Consistency Fix (Mar 2026)

- **Unified state file naming** — All phases now use `YYYY-MM-DD-<feature>.md` convention
- **Release file renames** — 51 release state files renamed from version-based to feature-based naming
- **Validate date fix** — 5 validate state files fixed from `YYYYMMDD-` to `YYYY-MM-DD-`
- **Skill template updates** — Release, validate, and retro templates updated to use new naming convention


### v0.14.14 — The Declutter, Part III (Mar 2026)

- **State L1 removal** — Deleted 5 dead state index files (`state/DESIGN.md` through `state/RELEASE.md`) that nothing consumed or maintained
- **Release skill cleanup** — Removed state L1 references from L0 proposal generation step


### v0.14.13 — The Visual Progress Language (Mar 2026)

- **Visual language spec** — New `skills/_shared/visual-language.md` defining `█▓░▒` block-element vocabulary for progress displays
- **Phase indicator** — Gradient density phase indicator at session start and phase announce showing completed/current/pending phases
- **Context bar** — Full diagnostic context bar with percentage, bar visualization, and token breakdown at checkpoints
- **Prime Directive update** — BEASTMODE.md now includes phase indicator display at session start
- **Context report update** — Switched from prose instructions to visual format with handoff guidance


### v0.14.12 — The Argument Docs (Mar 2026)

- **Retro loop doc** — Dedicated argumentative essay at `docs/retro-loop.md` covering the self-improving retro mechanism
- **Configurable gates doc** — Dedicated argumentative essay at `docs/configurable-gates.md` covering progressive autonomy through gates
- **README integration** — All three differentiator sections in "What's Different" now link to their full argument docs


### v0.14.11 — The Declutter, Part II (Mar 2026)

- **L0 simplification** — BEASTMODE.md cut from 81 to 42 lines; removed knowledge hierarchy tables, domain definitions, write protection table, sub-phase anatomy, slash commands, and configuration explanation
- **Persona pointer** — persona.md converted from full duplication to pointer referencing L0; unique content (context-awareness detail, skill announces) retained


### v0.14.10 — The Spec Update (Mar 2026)

- **Three Domains section** — `docs/progressive-hierarchy.md` now documents Context, Meta, and State as first-class domains
- **Write Protection section** — Promotion path rules (state-only writes, retro gatekeeper) added to the spec
- **Workflow section** — Five-phase pipeline and sub-phase anatomy documented in the spec
- **Level description fixes** — L0 line count corrected (~80), L1 dual-domain pattern shown


### v0.14.9 — The Banner Fix, For Real This Time (Mar 2026)

- **L0 Prime Directive** — Banner display instruction moved to BEASTMODE.md (autoloaded) with BEFORE-priority wording
- **Task-runner cleanup** — Removed dead Session Banner Check step; @import indirection never auto-expanded
- **Root cause** — Prior fixes targeted wording (v0.14.5) and task-runner (v0.14.6), but the real issue was @import non-expansion in HARD-GATE sections


### v0.14.8 — The Declutter (Mar 2026)

- **Remove CONTEXT.md** — L0 domain entry for Context removed; routing table duplicated by hierarchy conventions, zero consumers
- **Remove STATE.md** — L0 domain entry for State removed; kanban unused, `/beastmode:status` covers status needs


### v0.14.6 — The Banner Fix (Mar 2026)

- **Task-runner banner check** — New Step 1 in task-runner.md checks system context for SessionStart banner and displays it before skill execution
- **Prime Directive cleanup** — Removed redundant banner display directive from BEASTMODE.md; task-runner is sole owner
- **ANSI stripping** — Banner display strips escape codes so code blocks render cleanly


### v0.14.4 — The Format Standard (Mar 2026)

- **L1/L2/L3 format spec** — All context files standardized as rule-lists: dense summaries + numbered NEVER/ALWAYS rules
- **L3 context records** — New record format (Context/Decision/Rationale/Source) at `context/{phase}/{domain}/{record}.md`
- **Hierarchy table update** — L3 = Records, state removed from hierarchy levels in BEASTMODE.md
- **@imports removed** — All L1/L2 context files use convention-based paths
- **Retro format enforcement** — Context walker gains Format Enforcement section with `format_violation` finding type
- **Rule-writing principles** — Anti-bloat rules documented in retro agent: absolute directives, concrete rules, bullets over paragraphs


### v0.14.3 — The Write Guard (Mar 2026)

- **Write protection rule** — Phases write only to L3 state; retro is the sole gatekeeper for L0/L1/L2 promotion
- **Release L0 migration** — BEASTMODE.md updates flow through L3 proposal + retro promotion instead of direct write
- **Retro L0 promotion** — New step 10 applies L0 update proposals during release phase retro
- **Config gate** — `retro.l2-write` controls L2 context file creation during retro

### v0.14.2 — The Gap Detector (Mar 2026)

- **L2 gap detection** — Context walker gains Gap Detection Protocol with structured `context_gap` output type, confidence scoring, and accumulation-based promotion thresholds
- **Gap proposal processing** — Retro phase gains step 9 for processing context gap findings: logs gaps to learnings, gates file creation via `retro.l2-write`, creates approved L2 files with session-seeded content
- **New HITL gate** — `retro.l2-write` gate (default: human) controls L2 file creation approval

### v0.14.1 — The Agent's Handbook (Mar 2026)

- **L0 rework** — BEASTMODE.md rewritten as agent survival guide: prime directives, persona, workflow, knowledge hierarchy, domains, configuration
- **CLAUDE.md simplified** — Reduced to single `@.beastmode/BEASTMODE.md` import
- **Prime directives consolidated** — Moved from CLAUDE.md into BEASTMODE.md where they survive compression
- **Internal mechanisms removed** — Loading tables, compaction flow, writing guidelines, meta domain structure stripped from L0

### v0.14.0 — The Hierarchy Cleanup (Mar 2026)

- **BEASTMODE.md replaces L0 trio** — Single system manual (~108 lines) replaces PRODUCT.md, META.md, and .beastmode/CLAUDE.md as the sole autoload
- **@imports removed** — All L1 files use convention-based paths instead of @imports for L2 navigation
- **Three data domains** — Product domain merged into Context via `context/design/product.md`; four domains simplified to three (State/Context/Meta)
- **Skill primes updated** — All 5 phases load `context/{PHASE}.md` + `meta/{PHASE}.md` during prime (BEASTMODE.md autoloaded separately)
- **Retro agents modernized** — Convention-based L2 discovery replaces @import parsing

### v0.12.2 — The Cleanup (Mar 2026)

- **Unified gate syntax** — `[GATE|id]` / `[GATE-OPTION|mode]` replaces old `Gate:` format across all 20 gates
- **Standardized SKILL.md template** — task runner as first line in HARD-GATE, no trailing @imports
- **Import semantics** — `@file` = mandatory import, `[name](path)` = reference link, documented in conventions.md
- **Worktree detection fix** — state file reads now happen after worktree entry in plan/implement primes
- **Stale steps removed** — `Role Clarity`, `Load Prior Decisions`, prose `@` references cleaned up

### v0.12.1 — The Audit (Mar 2026)

- **ROADMAP accuracy audit** — moved shipped features (auto-chaining, persona) to Now, clarified partial implementations in Next, added designed-but-unshipped features (dynamic retro walkers), reordered Later by implementation proximity
- **Stale references removed** — "Progressive Autonomy Stage 2" with incorrect /compact references replaced by accurate "Phase auto-chaining" entry

### v0.11.1 — The Reflow (Mar 2026)

- **README restructure** — "What Makes It Different" → expanded "How It Works" + new "What Makes It Work" section
- **Mechanics-only prose** — Removed pitch framing, replaced with sharp explanations of how beastmode actually works
- **Session model documented** — Self-contained phase model (checkpoint → clean session → prime) now front and center

### v0.11.0 — The Squash (Mar 2026)

- **Squash-per-release** — `/release` uses `git merge --squash` to collapse feature branches into one commit on main
- **Archive tagging** — Feature branch tips preserved as `archive/feature/<name>` tags before deletion
- **GitHub release style commits** — `Release vX.Y.Z — Title` with categorized Features/Fixes/Artifacts body
- **Retroactive rewrite script** — `scripts/squash-history.sh` rebuilds main as one commit per version tag

### v0.10.1 — The Ungated Retro (Mar 2026)

- **Configurable retro gates** — 4 per-category `Gate:` steps (learnings, sops, overrides, context-changes) replace HTML comment annotations
- **Merge strategy gate** — Release merge/PR/keep/discard decision now configurable via `release.merge-strategy` gate
- **5 new config keys** — Fine-grained autonomous control for retro and merge phases
- **README differentiators section** — New "What Makes It Different" section with four substantial inline arguments: progressive hierarchy, compounding knowledge, session-surviving context, design-before-code

### v0.10.0 — The Visible Gate (Mar 2026)

- **Task-runner gate detection** — Gate steps processed by task runner with config.yaml lookup and mode-based substep pruning
- **Inline gate steps** — 15 `## N. Gate:` steps replace `<!-- HITL-GATE -->` annotations + `@gate-check.md`/`@transition-check.md` imports across all skill phases
- **Two-tier HITL system** — `<HARD-GATE>` for unconditional constraints, `## N. Gate:` for configurable human/auto behavior

### v0.9.0 — The Dynamic Retro (Mar 2026)

- **Dynamic retro walkers** — Replace hardcoded retro agents with structure-walking hierarchy walkers
- **Design approval summary** — Executive summary shown before design approval gate
- **Meta hierarchy** — Fractal L2 hierarchy for meta domain with SOPs, overrides, learnings per phase

### v0.8.1 — The Summary (Mar 2026)

- **Design approval summary** — Executive summary (goal, approach, locked decisions, acceptance criteria) shown before the approval gate so users see the full picture before approving

### v0.7.0 — The Argument (Mar 2026)

- **Progressive hierarchy essay** — New `docs/progressive-hierarchy.md` makes the case for curated hierarchical context over flat embedding retrieval
- **README rework** — "Why This Works" leads with hierarchy differentiator and links to the deep-dive essay
- **Agent-facing differentiators** — PRODUCT.md gains "Key Differentiators" section so agents understand *why* the hierarchy exists
- **docs/ directory** — External-facing documentation home, not imported by agents

### v0.6.1 — No More Rebase (Mar 2026)

- **Merge-only release** — Replaced `git rebase origin/main` with merge-only strategy; conflicts resolve once instead of per-commit replay
- **Fewer version files** — Dropped hardcoded version from README.md badge and PRODUCT.md `Current Version` section; version now lives in 3 files (plugin.json, marketplace.json, session-start.sh)

### v0.6.0 — The Paper Trail (Mar 2026)

- **CHANGELOG.md** — Consolidated 18 releases into 10 scannable entries with subtle personality in version titles
- **README changelog link** — Credits section now links to the full changelog

### v0.5.2 — Living Docs & README Rewrite (Mar 2026)

- **PRODUCT.md release rollup** — PRODUCT.md becomes a living document updated at release time with capabilities inventory and current version
- **README rewrite** — Restructured following high-star GitHub patterns: centered hero, badges, install-first layout, removed credibility killers

### v0.5.0 — Parallel Waves (Mar 2026)

- **Parallel wave dispatch** — /implement spawns agents concurrently within waves when file isolation analysis confirms no overlaps
- **File isolation analysis** — /plan detects file overlap per wave, auto-resequences conflicts, marks safe waves with `Parallel-safe: true`
- **Sequential fallback** — Graceful degradation to sequential dispatch when parallel safety can't be verified

### v0.4.1 — The Big Redesign (Mar 2026)

- **Implement v2** — Subagent-per-task execution model with wave ordering, deviation rules, and spec checks
- **Design v2** — Gray area identification, scope guardrails, role clarity, discussion pacing, and downstream-aware output
- **Plan improvements** — Wave-based task dependencies, design coverage verification, structured skill handoff
- **Lean prime refactor** — 0-prime is now read-only; all side effects moved to 1-execute
- **Lazy task expansion** — Sub-phases expand only when entered, reducing TodoWrite noise by ~60%
- **Git branching strategy** — `feature/<feature>` branches with `.beastmode/worktrees/` isolation
- **Phase retro system** — Parallel agents review context docs and capture meta learnings at every checkpoint
- **Release workflow** — Sync with main before version bump, fix version detection, retro before commit

### v0.4.0 — Fractal Knowledge (Mar 2026)

- **Progressive L1 docs** — Fractal knowledge hierarchy where every level follows the same pattern: summary + section summaries + @imports
- **`.beastmode/CLAUDE.md` manifest** — Pure @imports hub wiring all L0/L1 files into sessions
- **Retro bottom-up bubble** — 3-checkpoint propagates summaries L2 → L1 → L0
- **Fix: meta and state loading** — Meta learnings and state L1 files now actually loaded into sessions

### v0.3.6 — Plan & Release Polish (Mar 2026)

- **Wave-based task dependencies** — Plan task format gains `Wave` and `Depends on` fields for parallel execution
- **Design coverage verification** — Plan validation checks every design component maps to a task
- **Release version sync** — Rebase on main before bumping to eliminate version conflicts on merge
- **Release retro fix** — Retro moved before commit step so meta learnings get included in the release

### v0.3.3 — Lean & Lazy (Mar 2026)

- **Lazy task expansion** — Sub-phases expand only when a phase becomes active, not at parse time
- **Child collapse** — Completed phase children removed from TodoWrite to save tokens
- **Session tracking removal** — Eliminated `.beastmode/sessions/` directory; worktree lookup via path convention instead

### v0.3.1 — Phase Retro (Mar 2026)

- **Shared retro module** — Every workflow phase runs a scoped retro with 2 parallel agents at checkpoint
- **Context review agent** — Compares session artifacts against context docs for accuracy
- **Meta learnings agent** — Captures phase-specific insights with confidence levels
- **Quick-exit heuristic** — Skips agent review for trivial sessions

### v0.3.0 — Branching Out (Mar 2026)

- **Feature branches** — `feature/<feature>` naming replaces `cycle/<topic>`, spanning the entire design-to-release lifecycle
- **Worktree isolation** — Feature work happens in `.beastmode/worktrees/<feature>`, shared worktree-manager handles create/enter/merge/cleanup
- **Natural commits** — Removed "Do NOT commit" constraints; phases commit freely, release owns merge

### v0.2.0 — New Foundation (Mar 2026)

- **`.beastmode/` migration** — Replaced `.agents/` with organized four-domain structure: Product, State, Context, Meta
- **L0/L1/L2 hierarchy** — Efficient context loading: L1 always loaded, L2 on-demand
- **`/validate` skill** — Quality gate before release with tests, lint, type checks
- **Skill anatomy standard** — All workflow skills follow `0-prime → 1-execute → 2-validate → 3-checkpoint`
- **Release skill** — Version detection, commit categorization, changelog generation, interactive merge, git tagging
- **Task runner** — Shared utility enforces step completion via TodoWrite tracking

### v0.1.12 — Genesis (Mar 2026)

- **Session banner** — `hooks/session-start.sh` prints activation banner with version and random self-deprecating quote
- **Plugin hooks** — `plugin.json` gains hooks configuration with `${CLAUDE_PLUGIN_ROOT}` path variable
