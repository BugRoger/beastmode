# Changelog

All notable changes to beastmode.

---

## v0.118.0 — Frontmatter Contract Alignment (2026-04-12)

Defines an explicit frontmatter contract across all five phases, aligning field names between env vars, metadata-in, frontmatter, and output.json. Content fields move from frontmatter to artifact markdown body sections, making output.json a pure decisions-and-status signal.

### Features

- Unified field naming: `epic-id`, `epic-slug`, `feature-id`, `feature-slug`, `failed-features` across all layers
- Frontmatter contract documentation with per-phase field tables
- Session-stop uses unified field names in frontmatter pass-through and `buildOutput`
- Reconcile extracts content from artifact body sections (`## Problem Statement`, `## Solution`, `## What to Build`)
- All five skill templates updated to unified frontmatter field names
- Artifact type interfaces renamed to unified naming convention
- BDD world artifact writers updated to unified field names
- Cucumber feature files updated to unified frontmatter field names

### Chores

- Session-stop test fixtures updated to unified field names
- Reconcile tests updated to unified field names

---

## v0.117.0 — Unified Hook Context (2026-04-12)

Unifies all CLI hook context into five standardized `BEASTMODE_*` env vars and a structured metadata section in SessionStart. Renames `generate-output` to `session-stop` for naming symmetry. Pre-creates store entities before dispatch so IDs are available from the first hook invocation.

### Features

- Shared `buildEnvPrefix` function produces inline env var prefix for all command hooks
- All four hook builders (session-start, hitl-auto, hitl-log, stop) use unified env prefix
- SessionStart `additionalContext` includes structured metadata section with phase, entity IDs, parent artifacts, and output target path
- `computeOutputTarget` and `buildMetadataSection` exported for skill consumption
- Pipeline runner pre-creates store entity at Step 0 before dispatch
- `reconcileDesign` create-if-missing fallback removed — single entity creation path
- `generate-output.ts` renamed to `session-stop.ts` with `runSessionStop` entry point
- `SessionStartInput` extended with `epicId` and `featureId` optional fields
- HITL hooks read `BEASTMODE_PHASE` from env with positional arg fallback

### Fixes

- Complete session-stop rename in hooks.ts dispatcher and test APIs
- Use `epicId` from config instead of `epicSlug` in env context construction

### Chores

- Integration tests for session-stop-rename scenarios
- BDD portable-settings updated for new hook command strings
- Old `BEASTMODE_EPIC` / `BEASTMODE_SLUG` env var names removed from codebase

---

## v0.115.0 — Slug/ID Consistency (2026-04-11)

Eliminates slug/ID ambiguity across the entire pipeline. Environment variables, frontmatter, reconcile functions, store lookups, and mutex keys now use entity IDs exclusively.

### Features

- Replace `BEASTMODE_SLUG` with `BEASTMODE_ID` in hook environment variables
- Replace `fm.slug` with `fm.id` in frontmatter contract
- Update all call sites for the id parameter contract change
- Embed parent epic name in feature slugs with `--` separator
- Deduplicate slugify, replace randomHex with placeholder names
- Add placeholder name generator for human-readable feature slugs
- Accept dots in slug validation

### Fixes

- Fix remaining `store.find()` references missed by agent dispatch
- Fix BDD step definition parameter binding for slug-foundation tests
- Replace `toEndWith` with `toMatch` for type safety in slug-foundation tests
- Update tests for new feature slug format and slugify dedup

### Chores

- Replace slug params with epicId in all 6 reconcile functions
- Replace `store.find(slug)` with epicId lookup in pipeline runner
- Remove `find()` method from TaskStore interface and implementations
- Use `resolveIdentifier` instead of `store.find()` in store commands

---

## v0.114.0 — Dashboard Stats Persistence (2026-04-11)

### Highlights

Dashboard statistics now persist across restarts via a JSON file, and operators can toggle between all-time and current-session stats views with a keyboard shortcut.

### Features

- feat(stats-persistence): add persistence module with load/save/merge for cumulative dashboard stats
- feat(stats-persistence): wire persistence load and flush into App component
- feat(stats-view-toggle): add `s` key toggle for all-time vs current-session stats
- feat(stats-view-toggle): add toSessionStats converter
- feat(stats-view-toggle): add statsViewMode to DetailsPanel and resolver
- feat(stats-view-toggle): add stats mode to key hints bar

---

## v0.113.0 — Fix Tree Log Rendering (2026-04-11)

### Highlights

Fixes four dashboard tree log rendering bugs: SYSTEM routing filters epic-scoped entries, dispatched features show correct in-progress status, tree drawing characters stay dim grey regardless of log level, and only the level label carries color while messages remain white.

### Features

- feat(feature-status): upgrade pending features to in-progress when session exists
- feat(system-routing): gate systemRef entries on !context.epic

### Fixes

- fix(tree-format): decompose warn/error to segmented coloring
- fix: pass store feature slug to generate-output stop hook
- fix: preserve collision-proof hex suffix during design slug rename

---

## v0.112.0 — Remove Impl Branches (2026-04-11)

### Highlights

Remove implementation branches (`impl/<slug>--<feature>`) entirely from the pipeline. Parallel feature agents now commit directly to the shared feature branch, eliminating checkout races, rebase conflicts at checkpoint, and push failures caused by concurrent branch switching in the same worktree.

### Features

- Remove `implBranchName()` and `createImplBranch()` from worktree module and delete corresponding tests
- Remove `parseImplBranch()`, `ImplBranchParts` interface, and impl-specific commit routing from commit-issue-ref module
- Remove impl branch creation from pipeline runner and watch-loop fan-out dispatch
- Remove impl branch pushing from git push module
- Remove impl-to-feature-issue linking from branch-link orchestrator
- Remove impl branch cleanup loop from `worktree.remove()`
- Update implement skill: remove Phase 0 branch verification, Phase 3 rebase/merge, and impl branch agent constraints
- Update implement-dev agent: constraints reference `git add <files>` + `git commit` on the current branch
- Clean stale impl branch mocks from all test files

### v0.111.0 — Collision-Proof Slugs (Apr 2026)

- **Collision-proof epic slugs** — Epic slugs now embed the entity's 4-char hex short ID (e.g., `dashboard-redesign-f3a7`), making slug collisions structurally impossible
- **Ordinal feature slugs** — Feature slugs embed their ordinal suffix (e.g., `auth-flow-1`), replacing hash-based deduplication
- **CLI prefix resolution** — Opt-in prefix matching in `resolveIdentifier()` lets CLI users type `dashboard-redesign` to resolve `dashboard-redesign-f3a7`
- **In-place design reconciliation** — `reconcileDesign()` updates slug via `updateEpic()` instead of delete/recreate, preserving entity ID stability
- **Dead code removal** — Deleted `hashId()`, `deduplicateSlug()`, and `collectSlugs()` — structurally unreachable after ordinal-based derivation
- **Backward compatibility** — Old-format slugs continue working without migration; `slug?` parameter retained in signatures

---

### v0.110.0 — Wave Field Persistence (Apr 2026)

- **Wave field persistence** — `addFeature()` now persists the `wave` field on store features so dispatch respects wave ordering

---

### v0.109.0 — Session Start Hook (Apr 2026)

- **SessionStart hook** — New `session-start` hook assembles phase context automatically when a skill session begins, replacing the manual Phase 0 prime step across all five workflow skills
- **assembleContext core** — New `assembleContext` function reads BEASTMODE.md, config, and phase-specific L1/L2 context into a structured context object for hook injection
- **Settings writer** — `ensureSessionStartHook` and `writeSettingsFile` functions register the hook in Claude Code's `settings.local.json` automatically
- **CLI integration** — `session-start` command registered in the hooks router with full assembleContext wiring
- **Phase 0 removal** — Stripped the manual prime/context-loading step from design, plan, implement, validate, and release skills
- **Functional coupling rule** — New L0 plan rule: merge features whose acceptance criteria overlap even when file targets differ

---

### v0.108.0 — Sync Log Hygiene (Apr 2026)

- **Phase-aware sync gating** — `readPrdSections` and plan file reads now skip early via `isPhaseAtOrPast()` when the producing phase hasn't completed, eliminating expected missing-artifact warnings from the log
- **`isPhaseAtOrPast` utility** — Centralized phase comparison function in `cli/src/types.ts` replaces scattered string comparisons across the sync engine
- **Log level corrections** — `createLinkedBranch returned null` downgraded from warn to debug (idempotent success path); `readPrdSections` catch block downgraded from error to warn (degradation, not hard error)
- **Phase context propagation** — `logger.child({ phase: epic.phase })` at the sync entry point enriches all downstream log calls with phase context automatically

---

### v0.107.0 — Release Rebase Fix (Apr 2026)

- **Rebase before squash merge** — Release workflow now rebases the feature branch onto main before squash merge, preventing stale fork points from overwriting intermediate main commits
- **Remove dead merge()** — Removed unused `merge()` function from worktree utilities

---

### v0.106.0 — Integration Test Hygiene (Apr 2026)

- **Behavioral-change skip gate** — Plan skill step 4 now evaluates each feature's behavioral impact before dispatching the plan-integration-tester agent; documentation-only, refactoring, config-change, and covered-fix features are classified as non-behavioral and skip agent dispatch entirely
- **Agent consolidation analysis** — plan-integration-tester agent restructured to two-section artifact format (New Scenarios + Consolidation), replacing the prior three-section format; consolidation section absorbs merges, updates, and deletions to existing scenarios
- **Capability domain organization** — New scenarios organized by capability domain with happy-path priority and risk-based error path inclusion; Gherkin Feature lines carry both epic and capability tags
- **Test depth guidance** — Agent definition updated with test depth heuristics for scenario generation
- **Integration test feature files** — BDD feature files added for skip-gate and agent-consolidation behaviors documenting the behavioral contracts declaratively
- **Heading consistency fix** — Fixed heading level and Feature-line consistency in the consolidation template

---

### v0.105.0 — Details Panel Stats (Apr 2026)

- **Session stats accumulator** — Event-driven `SessionStatsAccumulator` subscribes to WatchLoop events (`session-started`, `session-completed`, `scan-complete`) and maintains running session metrics with dispose cleanup
- **Stats content variant** — New `kind: "stats"` variant in `DetailsContentResult` discriminated union renders live session statistics in the details panel when `(all)` is selected
- **Duration formatting** — `format-duration.ts` utility converts milliseconds to human-readable strings (e.g., "2m 30s")
- **Details panel wiring** — Stats accumulator instantiated in App component, connected to WatchLoop EventEmitter, stats snapshot passed through to DetailsPanel rendering
- **Test coverage** — +169 individual tests, +20 test files covering accumulator logic, duration formatting, and BDD integration scenarios
- **Test runner context correction** — L2 testing rules corrected from stale `bun:test` to `vitest` (project uses `bun --bun vitest run`)

---

### v0.104.0 — Version Awareness (Apr 2026)

- **Shared version module** — Single `cli/src/version.ts` resolves version from plugin.json at runtime, eliminating scattered hardcoded version strings
- **CLI help integration** — Help output uses shared version module instead of hardcoded string
- **Watch loop integration** — Status display uses shared version module for consistent version reporting
- **BDD coverage** — 6 Cucumber scenarios with inline World pattern verify end-to-end version resolution from plugin.json
- **Test runner context correction** — L2 testing rules now distinguish `bun:test` (store tests) from `vitest` (cli/__tests__) imports

---

### v0.103.0 — Dashboard Log Fixes (Apr 2026)

- **SYSTEM node rename** — Rename CLI root node to SYSTEM with hierarchical tree prefix connectors matching epic node formatting
- **Dynamic status badges** — Use session phase for dynamic epic node status, in-progress badges for dynamically created feature nodes
- **Event routing levels** — Classify watch-loop started as debug, prefer explicit `level` field in `entryTypeToLevel` mapping
- **Dashboard wiring** — Pass enrichedEpics to `useDashboardTreeState`, compute `maxVisibleLines` from terminal rows, split session-started into info + debug entries
- **Single-concern plan rule** — Add L0 process rule for single-concern feature decomposition during planning

---

### v0.102.0 — Fix Worktree Paths (Apr 2026)

- **Artifact path normalization** — Normalize absolute worktree paths to bare filenames via `basename()` in sync engine functions (`readPrdSections`, `syncFeature`, `buildArtifactsMap`), preventing filesystem path leakage into GitHub issue bodies
- **Output path sanitization** — Apply `basename()` to `buildOutput` for design, validate, and release artifact paths before storing in the manifest
- **Sync debug logging** — Add error logging to sync catch blocks and diagnostic logging to `syncFeature`, `buildArtifactsMap`, and `readPrdSections` for future troubleshooting

---

### v0.101.0 — npx Installer (Apr 2026)

- **Install command** — `npx @anthropic-ai/claude-code-beastmode install` provides zero-friction plugin setup: prerequisite checks, bun auto-install, CLI linking, JSON config merging, and post-install verification
- **Uninstall command** — `npx @anthropic-ai/claude-code-beastmode uninstall` cleanly removes plugin config entries and CLI links
- **Plain Node.js entry point** — npx CLI (`src/npx-cli/`) runs as pure ESM `.mjs` with no TypeScript, no build step, and no external dependencies — works before bun is available
- **README update** — Add system requirements, npx install command, and uninstall instructions

---

### v0.100.0 — CLI Hook Commands (Apr 2026)

- **Portable hook commands** — Replace absolute `import.meta.dir` paths with `bunx beastmode hooks <name> [phase]` CLI commands in all settings builders, making hooks portable across machines, worktrees, and installation paths
- **Hooks dispatch command** — Add `beastmode hooks <name> [phase]` CLI entry point that dispatches to hitl-auto, hitl-log, generate-output, and file-permission-settings handlers
- **HITL builder updates** — Update PreToolUse, PostToolUse, and file-permission builders to emit `bunx beastmode hooks` instead of `bun run <absolute-path>`
- **Git-initialized test dirs** — Fix integration tests to call `git init` in temp dirs before invoking CLI hook commands that internally use `git rev-parse`

---

### v0.99.0 — Fix Hook Paths (Apr 2026)

- **Absolute hook paths** — Replace fragile shell `$(dirname "$0")` substitution with `import.meta.dirname` in HITL and file-permission hook builders, making hook paths absolute and portable across worktrees
- **Remove static Stop hook** — Remove obsolete Stop hook from both `settings.json` and `hooks/hooks.json`; all hooks now generated into `settings.local.json` at dispatch time
- **Null guard fixes** — Add null guards for optional `file-permissions` config section in `config.ts` and pipeline runner timeout lookups

---

### v0.98.1 — README Refresh (Apr 2026)

- **HITL config example** — Replace fictional gates config in README with real `hitl:` structure from config.yaml
- **Domain list correction** — Fix domain attribution from "Meta" to "Research" in README knowledge hierarchy section
- **README accuracy test** — Add integration test validating README config examples and domain descriptions match actual project structure

---

### v0.98.0 — Dashboard Log Fixes (Apr 2026)

- **CLI verbosity filter** — CLI root entries now pass through `shouldShowEntry` so they respect the dashboard verbosity toggle instead of always rendering
- **Event routing and levels** — Add optional `level` field to `LogEntry`; lifecycle events route to the correct log with proper severity (debug for heartbeats, warn for dead sessions, error for failures); remove dual-write pattern
- **Version display** — Capture plugin version from the `started` lifecycle event and render it below the clock in the NyanBanner header

---

### v0.97.0 — Epic Sort by Date (Apr 2026)

- **compareEpics comparator** — Sort epics by most recent commit timestamp (descending), with slug-based tiebreaker for deterministic ordering
- **listEnrichedFromStore sort** — Apply compareEpics in the shared data layer so all consumers (dashboard, CLI) get sorted epics automatically
- **Integration test** — BDD scenario covering date-based epic ordering contract

---

### v0.96.0 — Static HITL Hooks (Apr 2026)

- **Command-type hooks** — Replace prompt-based HITL hooks with static command-type hooks; `buildPreToolUseHook(phase)` emits `type: "command"` entries instead of prompt injection
- **hitl-auto.ts** — Standalone auto-answer script that reads config at runtime, enabling config changes without hook regeneration
- **BDD integration tests** — Full Cucumber test suite for static HITL hook behavior with path resolution fixes

---

### v0.95.0 — Dashboard Extensions (Apr 2026)

- **Tree refactor** — Flatten tree hierarchy from Epic > Phase > Feature to CLI > Epic > Feature; phase displayed as colored badge, not tree level
- **Epics tree expansion** — Flat row model with `buildFlatRows` and `rowSlugAtIndex`; single-expand toggle, feature status colors
- **Details panel** — Renamed from OverviewPanel; context-sensitive content by selection type (all/epic/feature), artifact loading, PgUp/PgDn scroll
- **Keyboard extensions** — Tab focus toggle between Epics and Log panels, 'p' phase filter cycling, 'b' blocked toggle, arrow key routing by focused panel
- **Focus border** — Animated nyan rainbow border on focused panel using `NYAN_PALETTE[tick % 256]`
- **Dashboard wiring** — Wire all extensions into App.tsx: filters, scroll offsets, focus state, ThreePanelLayout integration

---

### v0.94.0 — GitHub Sync Resilience (Apr 2026)

- **Retry queue** — PendingOp types extending SyncRef, exponential backoff (2^retryCount ticks, max 5), enqueue/drain/resolve pure functions, enqueue on sync engine error paths
- **Reconciliation loop** — Bootstrap sync-refs from store, drain retry queue, full body/title/label reconciliation for entities with `bodyHash: undefined`, runs on every watch loop tick
- **Field mapping fix** — Map store status to phase, build artifacts from flat fields, normalize artifact paths to repo-relative
- **Bun mock fixes** — CryptoHasher and spawnSync global mocks for Node-mode vitest integration tests
- **Early issue titles** — Epic-prefixed titles for stub feature issues

---

### v0.93.0 — Manifest Absorption (Apr 2026)

- **Store schema extension** — Feature.slug, EnrichedEpic, NextAction, summary object shape, slug utilities (slugify, isValidSlug, deduplicateSlug)
- **Store import** — `beastmode store import` command with manifest-to-store migration path
- **GitHub sync separation** — Sync-refs I/O module separating issue/project references from store; rewrite runner, early-issues, and syncGitHub to use store entities
- **XState-store bridge** — Rewrite pipeline machine types, guards, actions, and reconciler for store entity types; inline regress into actions.ts
- **Consumer migration** — Dashboard, watch loop, phase command, cancel, and backfill migrated to store-only; listEnrichedFromStore scan
- **Manifest deletion** — Manifest module (pure.ts, store.ts, reconcile.ts) deleted; all remaining references cleaned up
- **Validation fixup** — Reconciler slug rename via delete+recreate, feature status sync, reDispatchCount persistence, worktree rename after slug change

---

### v0.92.0 — GitHub Sync Polish (Apr 2026)

- **Body enrichment** — Epic issues get full PRD (6 sections), feature issues get full plan (4 sections), human-readable titles
- **Git push** — Unconditional branch/tag push after every checkpoint with `hasRemote()` guard and warn-and-continue
- **Branch linking** — `createLinkedBranch` GraphQL mutation with delete-then-recreate workaround, node ID resolution helpers
- **Commit traceability** — Range-based rebase amend replacing single-commit HEAD amend; `resolveRangeStart`, `resolveCommitIssueNumber`, `amendCommitsInRange`
- **Backfill** — Full reconciliation command (sync, push, amend, link) with comprehensive test suite
- **Dead code removal** — Removed `resolveGitMetadata`, `readVersionTag`, Git section from body enrichment

---

### v0.91.0 — Logging Cleanup (Apr 2026)

- **Unified 4-level Logger** — Single Logger interface with debug/info/warn/error replacing six ad-hoc levels; structured LogEntry with key-value data support
- **Pluggable sink model** — StdioSink, DashboardSink, TreeSink behind one LogSink interface; verbosity gating moved to sinks, not Logger
- **Full call-site migration** — ~100 call sites migrated from three Logger implementations to unified API; console.error/console.log calls migrated to Logger
- **Dashboard sink** — DashboardSink routes log entries to dashboard stores; 2-level verbosity cycle (info/debug)
- **Tree sink** — TreeSink replaces TreeLogger; createTreeSink factory with tests
- **Integration tests** — Cucumber BDD scenarios for all 7 user stories with LoggingWorld API-behavioral pattern
- **Test updates** — All test mocks updated to 4-level Logger interface

---

### v0.90.0 — BDD Feedback Loop (Apr 2026)

- **Inline Gherkin distribution** — Plan invokes integration tester agent in batch, distributes scenarios inline into each feature plan (no dedicated Wave 1 integration-tests feature)
- **BDD verification in implement** — Post-wave BDD verification section with escalation docs, Task 0 convention discovery, and status summary stats
- **Targeted validate re-dispatch** — REGRESS_FEATURES event resets only failing features to pending (reDispatchCount budget of 2), passing features retain completed status; blanket REGRESS remains as fallback
- **regressFeatures() pure function** — ManifestFeature.reDispatchCount tracking with budget enforcement
- **Integration test scenarios** — 25 Cucumber scenarios (410 steps) covering full pipeline and validate feedback profiles

---

### v0.89.0 — Spring Cleaning (Apr 2026)

- **Delete cmux/SDK dispatch** — Remove cmux multiplexer, SDK streaming, SdkSessionFactory, and all related types; hardcode iTerm2 as the sole dispatch backend
- **Narrow DispatchStrategy** — Reduce to `interactive | iterm2` only; remove strategy from config and DispatchedSession events field
- **Delete watch/status commands** — Remove `watch` and `status` from CLI router, delete WatchTreeApp, tree-subscriber, and strategy selection cucumber files
- **Extract ReconcilingFactory** — Move to `dispatch/reconciling.ts`, rewire dashboard imports
- **Integration tests** — 20 new Cucumber scenarios across 8 feature files covering the simplified dispatch pipeline
- **Context tree cleanup** — Delete cmux context tree, update L2/L3 context files to remove all cmux/SDK/watch/status references

---

### v0.88.0 — GitHub Issue Enrichment (Apr 2026)

- **Commit issue refs** — Post-sync pipeline step amends commit messages with `(#N)` trailing format for epic/feature auto-linking in GitHub timeline
- **Compare URLs** — Epic body git metadata section includes compare URL with active branch range during development, archive tag range after release
- **Early issue creation** — Pre-dispatch pipeline step creates GitHub issues before phase dispatch so issue numbers are available from the first commit
- **Enrichment pipeline fix** — Artifact paths wired through reconcile functions; `artifacts` field added to EpicEvent; dead `enrich()` function removed
- **Backfill script** — `backfill-enrichment` script for retroactively enriching existing epic issues
- **Integration tests** — 26 Cucumber scenarios across 7 feature files covering all enrichment capabilities

---

### v0.87.0 — Dead Man Switch (Apr 2026)

- **Liveness engine** — External process liveness detection via iTerm2 TTY process tree inspection; `checkLiveness` on `SessionFactory` interface (optional) probes `ps -t <tty>` for `beastmode` in args
- **Session death detection** — Dead sessions force-resolved and re-dispatched via existing rescan path; `session-dead` event emitted for observability
- **TTY management** — TTY device paths captured at dispatch time via `It2Client.getSessionTty()`; dual-ID mapping bridges dispatch session IDs to iTerm2 pane session IDs
- **Map lifecycle** — Cleanup for ttyMap, resolvers, and dispatchToPaneId in all completion and abort paths
- **Integration tests** — Cucumber scenarios for crashed session detection, dead session re-dispatch, session isolation, session-dead event logging, and instrumentation-free liveness

---

### v0.86.0 — Dashboard Polish (Apr 2026)

- **Monokai Pro palette** — Centralized color module with hex/ANSI constants replacing scattered hardcoded values across all dashboard components
- **Smooth gradient** — 256-step interpolated nyan banner palette replacing 6-color hard-switch
- **Depth hierarchy** — Three-tier panel background system (chrome → mid → deep) with header/hints chrome bands
- **Layout restructure** — Vertical split layout with outer chrome removed, panel interior backgrounds via PanelBox
- **Banner fixes** — Correct D/K character swap and trailing dot count
- **Integration tests** — Cucumber scenarios for all dashboard-polish features with shared DashboardWorld helpers

---

### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.84.0 — Structured Task Store (Apr 2026)

- **Store backend** — `store.json` persistence layer with `JsonFileStore` for CRUD operations, hash-based `bm-xxxx` IDs, cross-epic `depends_on` dependency modeling, and file-level mutex for concurrent access
- **Store CLI** — `beastmode store` command namespace with epic/feature CRUD, query commands (`ready`, `blocked`, `tree`, `search`), and JSON output contract
- **ID resolution** — `resolveIdentifier` function with dual-reference support (hash ID or human slug), ambiguity detection, and manifest fallback for coexistence
- **Phase integration** — Store-based ID resolution wired into phase dispatch pipeline alongside existing manifest system
- **Integration tests** — Cucumber BDD suite with `InMemoryTaskStore` test double covering 10 user stories: ready queries, hash IDs, cross-epic deps, tree view, dual reference, dependency ordering, typed artifacts, JSON output, backend CRUD, and blocked detection

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.83.0 — File Permission Hooks (Apr 2026)

- **File permission config** — Declarative `file-permissions:` section in config.yaml with per-category prose fields and "always defer to human" defaults
- **Hook builders** — Generate Claude Code PreToolUse prompt hooks from config, targeting Write/Edit with `if`-field path filtering per category
- **Dispatch integration** — File permission hooks written alongside HITL hooks at watch, phase, and pipeline runner dispatch time
- **Permission logging** — PostToolUse command hooks for Write/Edit events with unified log entry formatting and routing
- **Integration tests** — Cucumber BDD suite covering config parsing, hook generation, decision logging, and lifecycle scenarios

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.82.0 — Dashboard Wiring Fix (Apr 2026)

- **ThreePanelLayout wiring** — Replaced dead TwoColumnLayout with ThreePanelLayout in App.tsx as the primary dashboard layout
- **Cucumber integration tests** — Added BDD integration test suite for dashboard wiring: Gherkin scenarios, DashboardWorld with source-analysis pattern, step definitions, and cucumber profile

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.81.0 — Flashy Dashboard (Apr 2026)

- **NyanBanner** — Animated 2-line ASCII block art header with continuously cycling 6-stripe rainbow colors (80ms tick, pure color engine in `nyan-colors.ts`)
- **OverviewPanel** — Static pipeline summary replacing dynamic DetailsPanel: phase distribution, active sessions count, git branch status
- **Layout polish** — Inline border titles in PanelBox (custom top line, no third-party dependency), fullscreen auto-expansion via `useTerminalSize()` explicit height

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.80.0 — Plan Integration Tester (Apr 2026)

- **Plan-integration-tester agent** — New domain-specialist agent spawned by plan skill post-decomposition to generate BDD integration test features from PRD user stories
- **Integration test generation step** — Plan skill execute phase now includes an integration test generation step that diffs PRD against existing `.feature` files and produces Gherkin integration artifact at wave 1

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.79.0 — Dashboard Full-Height Redesign (Apr 2026)

- **Two-column layout** — Replaced ThreePanelLayout with full-height TwoColumnLayout (40/60 split), stacking epics and details panels in the left column with a full-height tree view on the right
- **Panel styling** — Added backgroundColor prop to PanelBox for dark charcoal (#2d2d2d) interior backgrounds, removed outer chrome border
- **Epic list icons** — Replaced row layout with status-aware icons (selected arrow, running spinner, phase-colored idle dot, dimmed done dot) and compact slug + phase badge format
- **Icon selection tests** — Added pure function extraction for testable icon selection logic with full test coverage

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.78.0 — Agent Refactor (Apr 2026)

- **Specialized agents** — Replaced monolithic implement-implementer with three focused agents: implement-dev (TDD execution), implement-qa (verification), implement-auditor (spec compliance)
- **Native dispatch** — Rewired all skill dispatch from `.claude/agents/` YAML to `subagent_type` parameters, eliminating manual prompt assembly
- **Legacy cleanup** — Deleted `.claude/agents/` directory and `implement-implementer.md`, replaced by plugin agent definitions
- **Context updates** — Agent naming convention (`<phase>-<role>`) and dispatch pattern captured in L2 context docs

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.77.0 — Dashboard Wiring (Apr 2026)

- **Three-panel layout** — App.tsx rewritten to use ThreePanelLayout with EpicsPanel, DetailsPanel, LogPanel as slot children, replacing the legacy drill-down navigation model
- **Legacy component deletion** — Removed EpicTable, FeatureList, AgentLog, ActivityLog, CrumbBar, view-stack module, and associated keyboard hooks
- **Barrel export cleanup** — Updated barrel exports and key hints for the new panel architecture
- **Integration test suite** — Added App wiring integration test with 22 tests and 56 assertions validating end-to-end dashboard wiring
- **Context docs updated** — DESIGN.md Dashboard section rewritten for three-panel model, L3 dashboard records updated

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.76.0 — Watch HITL Fix (Apr 2026)

- **Watch loop HITL injection** — `dispatchPhase()` in `watch.ts` now writes HITL hooks and rebases onto main before SDK dispatch, so AskUserQuestion calls respect the `hitl:` config instead of blocking for human input
- **skipPreDispatch comment fix** — `runner.ts` comment updated to accurately describe the contract: watch factory owns steps 1-3, runner skips them
- **Watch dispatch parity rule** — L2 context updated with explicit invariant: when adding new pre-dispatch steps to the runner, also add them to `dispatchPhase()`

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.75.0 — Impl Branch Naming (Apr 2026)

- **Isolated implementation branches** — Parallel worktree agents use `impl/<slug>--<feature>` branches instead of `feature/<slug>/<feature>`, eliminating git ref namespace collisions
- **`implBranchName` utility** — Naming function for consistent `impl/<slug>--<feature>` convention
- **Idempotent `createImplBranch`** — CLI-owned branch creation with try-catch robustness
- **Pipeline integration** — Impl branch created in both pipeline runner and watch loop before dispatch
- **Automatic cleanup** — Impl branches deleted on worktree removal
- **Skill updates** — SKILL.md, agent, and context files updated to reference new convention

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.74.0 — Model Escalation Ladder (Apr 2026)

- **Three-tier escalation ladder** — Implementer agents start on haiku and automatically escalate to sonnet, then opus, when blocked or quality review fails with critical issues
- **Per-task reset** — Each new task starts at haiku regardless of previous task's escalation; no sticky escalation across tasks
- **Retry budget** — 2 retries per model tier, max 6 total attempts per task before marking BLOCKED
- **BLOCKED handler escalation** — Retry exhaustion at current tier triggers escalation to next tier
- **Quality review escalation** — NOT_APPROVED with Critical/Important severity issues triggers model escalation
- **Non-escalation boundaries** — NEEDS_CONTEXT and spec review FAIL do not trigger escalation (context/requirement issues, not model capability)
- **Report visibility** — Implementation report logs final model tier and escalation count per task

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.73.0 — Tree Log View (Apr 2026)

- **Shared TreeView component** — Hierarchical tree rendering (epic > phase > feature) with vertical line connectors and phase-based coloring, used by both `beastmode watch` and dashboard log panel
- **TreeLogger** — Drop-in Logger interface replacement that routes messages into tree state for Ink rendering instead of stdout; `child()` creates scoped sub-loggers matching the tree hierarchy
- **useTreeState hook** — React hook managing tree state with mutations for adding epics, phases, features, and log entries; shared between watch and dashboard
- **Dashboard adoption** — `useDashboardTreeState` adapter transforms existing ring buffer entries + session events into tree state, swapping only the rendering layer while preserving data flow
- **Watch integration** — `WatchTreeApp` Ink component with `attachTreeSubscriber` for WatchLoop-to-tree wiring; `--plain` flag and non-TTY detection fall back to flat format
- **Tree format functions** — `formatTreeLogLine` simplified output (no phase/scope columns since tree position conveys hierarchy); tree data types with depth-aware prefix rendering

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.72.0 — Implement v3: Write Plan, Agent Review Pipeline, Branch Isolation (Apr 2026)

- **Write Plan** — Replaces implicit task decomposition with a visible `.tasks.md` document containing complete code, TDD cycles, file structure mapping, and strict no-placeholder rule; self-review pass scans for spec coverage, forbidden patterns, and naming consistency before dispatch
- **Agent Review Pipeline** — Three dedicated agent files (implementer, spec-reviewer, quality-reviewer) with four-status model (DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED) and two-stage ordered review: spec compliance reads actual code before quality review runs
- **Branch Isolation** — Isolated implementation branches per feature (`feature/<slug>/<feature>`) with per-task commits; checkpoint rebases back to worktree branch with auto-retry conflict resolution agent
- **Subagent Safety** — Agents commit on impl branch only, never on worktree branch; branch verification in Prime ensures correct checkout before dispatch

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.71.0 — CLI Restructure (Apr 2026)

- **Unified pipeline runner** — Both manual CLI and watch loop call the same 9-step `pipeline/runner.ts`, eliminating duplicated worktree setup, dispatch, reconciliation, and teardown logic
- **Worktree rebase step** — Feature branches automatically rebase onto local main before each phase dispatch (except design), preventing merge distance accumulation across multi-phase workflows
- **Domain directory restructure** — CLI source reorganized into seven domain directories (`git/`, `hooks/`, `dispatch/`, `pipeline/`, `settings/`, `artifacts/`, `manifest/`) with uniform CRUD verb naming
- **Dead code removal** — Unused exports, orphan modules, and stale files cleaned up; net reduction in codebase size

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.70.0 — GitHub Issue Enrichment (Apr 2026)

- **Progressive body enrichment** — Epic and feature issue bodies fill with PRD content, user stories, artifact links, and git metadata as epics advance through phases
- **Section extractor/splitter** — Regex-based markdown parser extracts named sections from PRD and plan artifacts by `##` headings
- **Artifact reader** — Resolves design/plan/validate/release artifacts from manifest paths with slug glob fallback and graceful degradation
- **Feature user stories** — Feature issue bodies include their user story extracted from plan files
- **Release traceability** — Epic body updated with version, release tag, and merge commit links on release
- **Release closing comment** — Closing comment posted to epic issue announcing version, tag, and merge commit
- **Presence-based rendering** — Missing fields produce no output, not empty sections; bodies degrade gracefully

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.69.0 — Watch Log Format (Apr 2026)

- **Fixed-width phase column** — Extracts phase as a 9-character column for vertical alignment across all log lines
- **Scope truncation** — 32-character budget with trailing ellipsis for long epic/feature names
- **Message deduplication** — Strips phase/epic/feature info from message text when already present in structured prefix
- **costUsd guard** — Omits cost from completion messages when undefined instead of crashing on `.toFixed()`
- **Dashboard parity** — Activity log inherits new format automatically via shared `formatLogLine`

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.68.0 — Release Serialization (Apr 2026)

- **Release gate** — Serializes release phase dispatch so only one epic releases at a time, preventing squash-merge conflicts on main; FIFO ordering by manifest creation date
- **`release:held` event** — New typed WatchLoop EventEmitter event carrying waiting/blocking epic slugs, logged at info level for pipeline observability
- **Dashboard queue indicator** — "Queued" badge on held epics with blocking epic tooltip, driven by `release:held` events

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.67.0 — HITL Config Seed (Apr 2026)

- **HITL config section** — Seeds `hitl:` into `.beastmode/config.yaml` for projects predating the HITL feature, making per-phase human-in-the-loop behavior visible and tunable
- **Design stays human** — Design phase set to `"always defer to human"`, preserving collaborative interviews
- **Pipeline stays auto** — Plan, implement, validate, release set to fully autonomous mode
- **Init template parity** — Includes `model: haiku` and `timeout: 30` matching the init template defaults

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.66.1 — Gray Area Sweep Simplify (Apr 2026)

- **Serial gray-area sweep** — Replaced batched multi-select loop with one-at-a-time flow, presenting gray areas in priority order (most ambiguous first)
- **Reduced interaction overhead** — Removed dedicated "Skip" and "You decide" options; built-in Other field covers both bail-out and delegation

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.66.0 — Dashboard Rework (Apr 2026)

- **Three-panel layout** — k9s-style split screen with epics list (top-left), details (top-right), and log (bottom full-width), replacing the old drill-down navigation model
- **Epics panel** — Keyboard navigation, `/` filter, `x` cancel with inline confirmation, `a` toggle done/cancelled
- **Details panel** — Epic metadata, feature list with phase-colored status indicators, and progress bars
- **Log panel** — Auto-follow log stream, epic-filtered or aggregate "(all)" mode with ring buffer per session
- **Old dashboard cleanup** — Removed view stack, push/pop navigation, breadcrumb bar, and activity log components
- **99 new tests** — Full test coverage across all four new panels

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.65.0 — Structured Logging (Apr 2026)


- **Shared format function** — `shared/log-format.ts` with Pino-pretty style output: `[HH:MM:SS] LEVEL  (phase/epic/feature):  message`
- **Logger API** — `createLogger(verbosity, context)` with `.child()` context merging, replacing flat slug strings
- **Call site migration** — All ~15 call sites migrated from raw console.log to structured logging API
- **Dashboard format** — ActivityLog uses shared `formatLogLine()` for consistent visual output across CLI and TUI
- **NO_COLOR support** — Graceful degradation via NO_COLOR/FORCE_COLOR/isatty() detection
- **Null logger** — `.child()` returns null logger, preserving the null object pattern

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.64.0 — GH Error Diagnostics (Apr 2026)

- **Endpoint in error messages** — `gh()` error messages now show `args.slice(0, 2)` instead of just the verb, surfacing the actual API endpoint on failure
- **Logger threading** — All 11 `gh*` helper functions in `gh.ts` accept optional `logger?: Logger` for epic-scoped context propagation
- **Sync layer wiring** — `syncGitHub()` and `syncGitHubForEpic()` thread logger through all GitHub API call sites

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.63.0 — HITL Config (Apr 2026)

- **Per-phase HITL config** — Prose config in `config.yaml` under `hitl:` key with "always defer to human" defaults for all phases
- **Prompt hook** — `PreToolUse` hook on `AskUserQuestion` reads HITL instructions and auto-answers or silently defers to the human
- **Decision logging** — `PostToolUse` command hook logs all auto and human decisions to `hitl-log.md` per phase
- **Skill contract** — L0 prime directive + guiding principle in all 5 skill files requiring `AskUserQuestion` for all user input
- **Retro integration** — Context walker analyzes HITL logs, identifies repetitive human decisions, generates `config.yaml` snippets for automation

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.62.0 — Epic Tab Cleanup (Apr 2026)

- **Release cleanup** — Wire `cleanup()` into ReconcilingFactory's release teardown so epic tabs/workspaces close automatically on successful release
- **Error badge** — Failed releases set a badge on the tab session so users know which lingering tabs need attention
- **Orphan reconciliation** — Startup reconciliation closes tabs for done-manifest epics instead of adopting them, covering both iTerm2 and cmux strategies
- **Context promotions** — Documented decorator-forwarding anti-pattern and best-effort visual cleanup convention

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.61.1 — Remove Cost Tracking (Apr 2026)

- **Dead code removal** — Stripped all cost-tracking plumbing (`costUsd`, `cost_usd` fields, `$0.00` formatting) that always displayed zero because non-SDK dispatch strategies can't introspect cost data
- **Type cleanup** — Removed `costUsd` from `SessionResult`, `CompletionEntry`, and `PhaseResult`; removed `cost_usd` from interactive runner
- **Session adapter cleanup** — Removed `costUsd: 0` hardcodes from cmux and iTerm2 session adapters
- **Watch loop cleanup** — Removed cost capture logic and `$X.XX` formatting from watch command output
- **Docs cleanup** — Deleted `cost-tracking.md` and `cost-separation.md` context docs; removed cost references from DESIGN.md and CLI context
- **Gitignore cleanup** — Removed `.beastmode-runs.json` entry

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.61.0 — Exhaustive Gray Area Sweep (Apr 2026)

- **Auto-continuation loop** — Gray area sweep in design skill now auto-continues until 0 gray areas remain, replacing the opt-in "3 more or satisfied?" prompt
- **Skip escape hatch** — "Skip — move to validation" option in every batch's AskUserQuestion; Skip wins over co-selected gray areas
- **Session deduplication** — Resolved gray areas tracked per session, never re-surfaced in later batches
- **Partial batch support** — Presents 1-2 remaining gray areas when fewer than 3 exist
- **Express path parity** — Existing-document express path inherits the same exhaustive sweep behavior

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.60.2 — Skill Doc Restructure (Apr 2026)

- **Uniform section ordering** — All 5 phase skills (design, plan, implement, validate, release) restructured to follow Title > HARD-GATE > Guiding Principles > Phase 0-3 > Constraints > Reference ordering
- **3-level heading hierarchy** — Enforced `#` title, `##` major sections, `###` subsections max across all skill files
- **Guiding Principles sections** — Each skill gets 2-4 skill-specific operating principles extracted from existing prose
- **Constraints sections** — All anti-pattern rules ("NEVER", "do NOT") collected into dedicated `## Constraints` sections
- **Reference sections** — Templates, formats, and reference material moved to `## Reference` at the end of each skill

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.60.1 — Remove Task Runner (Apr 2026)

- **Skill flattening** — All 5 phase skills (design, plan, implement, validate, release) collapsed from multi-file `phases/` + `references/` structure into single self-contained SKILL.md files with inline phase sections
- **Task runner removed** — `skills/task-runner.md` deleted; TodoWrite references removed from all HARD-GATE blocks
- **Context cleanup** — Task-runner L2/L3 docs removed; 16 stale references to `phases/`, `_shared/`, and `@imports` fixed across context hierarchy
- **Net reduction** — 1782 added, 1743 removed across 63 files

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.60.0 — Dashboard Drill-Down (Apr 2026)

- **View stack navigation** — k9s-style push/pop drill-down across three views: EpicList, FeatureList, AgentLog (Enter to drill, Escape to pop)
- **Breadcrumb bar** — Shows current position in the view stack (e.g., `epics > cancel-cleanup > cancel-logic`)
- **Context-sensitive key hints** — Bottom bar updates per view type with available keybindings
- **SDK streaming refactor** — Dispatch refactored from fire-and-forget to async generator iteration with EventEmitter; `includePartialMessages` enables text delta and tool call streaming
- **Structured message mapper** — Converts SDKMessage types to terminal-friendly log entries (text deltas inline, tool calls as one-liners)
- **Ring buffer per session** — ~100 entries collected continuously per dispatched SDK session for instant history on navigation
- **SDK dispatch override** — Dashboard forces SDK dispatch strategy at runtime regardless of config setting

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.59.0 — Remove Gates (Apr 2026)

- **Gate mechanism removed** — `[GATE|...]` / `[GATE-OPTION|...]` syntax stripped from all skill phase files; design inlines interactive behavior directly, non-design phases inline auto behavior as sole code path
- **CLI degated** — `GatesConfig` types, `resolveGateMode()`, gate-checking logic in `checkBlocked()` removed from TypeScript codebase
- **Config simplified** — `gates:` section removed from config.yaml; fewer knobs, less confusion
- **Task-runner streamlined** — Gate detection block removed; execution loop no longer pauses on gate checks
- **Context docs updated** — Gate references purged from DESIGN.md, BEASTMODE.md, and 33 L1-L3 context files
- **Dead code cleanup** — sdk-runner, run-log removed; test dirs consolidated
- **Net reduction** — 643 added, 1680 removed across 152 files

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.58.0 — Cancel Cleanup (Apr 2026)

- **Shared cancel module** — `cancel-logic.ts` provides ordered cleanup (worktree, branch, archive tags, phase tags, artifacts, GitHub issue, manifest) consumed by CLI, dashboard, and design-abandon
- **`--force` flag** — Skips confirmation prompt for automated pipelines
- **Idempotent cancel** — Running cancel twice succeeds with nothing left to clean
- **Warn-and-continue** — Failure in one cleanup step doesn't block the rest
- **Artifact matching** — Uses epic name from manifest, falls back to identifier on re-run; research artifacts preserved
- **GitHub integration** — Issue closed as not_planned when github.enabled and epic number present
- **Fix** — Derive output.json filename from worktree name, not artifact name

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.57.1 — Design Abandon Cleanup (Apr 2026)

- **Primary abandon gate** — Detects missing design output after `runInteractive()` returns, triggers cleanup sequence (worktree removal, manifest deletion, GitHub issue close)
- **Secondary post-dispatch guard** — Prevents `DESIGN_COMPLETED` event when no output artifact exists, blocking state machine advancement
- **Idempotent `store.remove()`** — Returns false for missing files, safe to retry
- **Test coverage** — 16 new tests for design abandon gate (both exit paths), post-dispatch guard, and manifest store remove idempotency
- **Net code reduction** — 349 added, 609 removed across 23 files

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.57.0 — Phase Rerun (Apr 2026)

- **Phase regression/rerun** — Overloads `beastmode <phase> <slug>` to detect when the requested phase is at or behind the current phase, resetting the branch to the predecessor phase's tag and rerunning fresh
- **Phase detection matrix** — Four-case exhaustive detection: regression (requested < current), same-phase rerun (requested == current with prior commits), normal forward (no prior), forward-jump blocked (requested > current)
- **Generic REGRESS event** — New XState machine event (`{ type: "REGRESS", targetPhase }`) replaces the hardcoded VALIDATE_FAILED transition; guard enforces valid regression targets
- **CLI-managed git tags** — `beastmode/<slug>/<phase>` tags created at each phase checkpoint for deterministic reset targets; deleted on regression, renamed during slug rename
- **Crash-safe ordering** — Delete downstream tags, git reset, regress manifest; missing tags are harmless, next phase recreates them
- **Watch loop auto-regression** — Validate failure sends REGRESS with targetPhase "implement" instead of VALIDATE_FAILED; no confirmation prompt in automated mode
- **Confirmation prompt** — Manual CLI prompts before destructive regression; watch loop skips for unattended operation
- **Feature reset** — All features reset to pending when regressing to or past implement phase
- **Deletions** — VALIDATE_FAILED event type, constants, and legacy tests fully removed

---
### v0.85.0 — Dashboard Dispatch Fix (Apr 2026)

- **Strategy dispatch** — Replace broken CLI fallback with proper `selectStrategy()` wired into dashboard command, respecting configured dispatch strategy
- **Verbosity cycling** — Root-level App state ownership with `v` key handler, render-time filtering in LogPanel, and key hints bar indicator
- **Event log fallback** — `FallbackEntryStore` with lifecycle-to-LogEntry converter, WatchLoop lifecycle events wired into `useDashboardTreeState` for non-SDK dispatch visibility
- **Integration tests** — 6 Gherkin feature files with 22 scenarios covering strategy selection, auto-detection, CLI fallback, and error handling via `DashboardDispatchWorld`

---

### v0.56.0 — Slug Redesign (Apr 2026)

- **Standardized YAML frontmatter** — Consistent `slug`, `epic`, `feature` fields across all 5 phases with phase-specific additions (`wave`, `status`, `bump`)
- **`store.rename()`** — Single atomic method handling all 7 slug-keyed resources (artifacts, branch, worktree, manifest file, manifest content)
- **`store.find()`** — Resolves epics by either hex slug or human-readable name
- **`slugify()` / `isValidSlug()`** — Centralized format validation in the manifest store
- **Collision resolution** — Deterministic `<epic>-<hex>` suffix when slugs collide
- **Single `store.save()` persist** — One call per dispatch; no more multiple writes or mid-transaction divergence
- **`output.json` as sole LLM-to-CLI channel** — Replaces commit-message regex parsing
- **Deletions** — `rename-slug.ts`, `resolveDesignSlug()` regex parser, `skipFinalPersist` flag, disk writes from machine persist action, rename logic from `store.save()`

### v0.55.0 — Fullscreen Dashboard (Mar 2026)

- **`beastmode dashboard` command** — Fullscreen terminal UI built with Ink v6.8.0 + React for monitoring and controlling the pipeline
- **Three-zone layout** — Header bar with clock, scrollable epic table with progress bars and spinners, activity log with auto-scroll
- **Embedded watch loop** — Dashboard IS the orchestrator; WatchLoop refactored to extend EventEmitter with typed events (`epic:start`, `epic:complete`, `epic:error`, `phase:start`, `phase:complete`, `scan`)
- **Keyboard navigation** — q/Ctrl+C (quit), up/down arrows (row selection), x (cancel epic with inline y/n confirmation), a (toggle auto-scroll)
- **Cancel epic action** — Triggers XState state machine CANCEL event AND aborts running sessions via DispatchTracker
- **Shared data module** — Extracted `status-data.ts` with pure functions for sorting, filtering, snapshot building, and change detection; shared between `beastmode status` and `beastmode dashboard`
- **Externalized signal handling** — Signal handlers moved out of WatchLoop; callers (watch command, dashboard) own SIGINT/SIGTERM and call `loop.stop()`

### v0.54.2 — Skill Cleanup (Mar 2026)

- **Dead file removal** — Deleted `persona.md`, `0-prime-template.md`, `3-checkpoint-template.md` from `skills/_shared/`
- **Persona consolidation** — Merged context-awareness and skill-announce sections into BEASTMODE.md; removed `@persona.md` imports from all 5 skill prime phases
- **Directory flatten** — Moved `task-runner.md` to `skills/` root, updated all 5 SKILL.md import paths, deleted empty `_shared/` directory
- **Dangling import cleanup** — Removed stale `@retro.md` import from design checkpoint

### v0.54.1 — Remove Dead Gates (Mar 2026)

- **Plan gate removal** — Deleted `feature-set-approval` and `feature-approval` gates from plan execute and validate skills; steps renumbered
- **Slug gate collapse** — Collapsed `slug-proposal` gate in design checkpoint to auto-derive behavior (Claude synthesizes slug from problem statement, no prompt)
- **Config cleanup** — Removed `plan.feature-set-approval`, `plan.feature-approval`, and `design.slug-proposal` entries from `config.yaml`

### v0.54.0 — Retro Consolidation (Mar 2026)

- **Release-only retro** — Retro runs once at release with all phase artifacts instead of after every phase checkpoint, producing a coherent cross-phase knowledge update
- **Context walker sole agent** — Meta walker deleted, context walker is the only retro agent
- **Inlined retro orchestration** — Release skill inlines retro directly, no shared `_shared/retro.md` import
- **Single retro gate** — Four retro gates (`records`, `context`, `phase`, `beastmode`) collapsed to single `retro.beastmode: human`; L3/L2/L1 changes apply automatically
- **Meta tree removal** — Universal meta rules migrated to BEASTMODE.md process sections, entire `meta/` directory deleted
- **Compaction decoupled** — Automatic compaction removed from release; manual-only via `beastmode compact`
- **Knowledge docs updated** — DESIGN.md and RELEASE.md context docs updated to reflect new retro behavior

### v0.53.0 — GitHub Issue Enrichment (Mar 2026)

- **Epic body formatting** — Epic issues now display a phase badge, problem statement, solution summary, and a feature checklist with `[x]`/`[ ]` completion status and `#N` issue links
- **Feature body formatting** — Feature issues show plan description text with epic back-reference
- **Manifest summary fields** — `summary` (problem + solution) on `PipelineManifest`, `description` on `ManifestFeature`, populated by design and plan checkpoints respectively
- **Sync body update** — `ghIssueEdit` accepts optional `body` param, formats and writes issue bodies on every sync pass
- **Hash-compare short-circuit** — `github.bodyHash` stores last-written content hash, skips API call when body unchanged
- **Graceful fallback** — Missing summary fields still produce richer body (phase badge + checklist) instead of stub
- **Cancelled features excluded** from checklist; manifest array order preserved

### v0.52.0 — GitHub Sync Watch Loop (Mar 2026)

- **Watch loop sync** — `reconcileState()` now calls `syncGitHubForEpic()` after persistence, with discovery cached once per scan cycle and per-epic logger support
- **Sync helper extraction** — New `syncGitHubForEpic()` in `github-sync.ts` encapsulates the full sync lifecycle (config → discover → sync → apply mutations → warn-and-continue), replacing the inline block in `post-dispatch.ts`
- **Cancelled phase sync** — Cancelled epics map to Done board column, get `phase/cancelled` label, and close on GitHub just like done epics

### v0.51.0 — XState Pipeline Machine (Mar 2026)

- **XState v5 epic machine** — Explicit state machine with 7 states (design → plan → implement → validate → release → done/cancelled), named guards (`hasFeatures`, `allFeaturesCompleted`, `outputCompleted`), and declarative actions (`persist`, `enrichManifest`, `renameSlug`, `syncGitHub`) via `setup()` API
- **Feature status machine** — Separate 4-state machine (pending → in-progress → completed → blocked) for feature lifecycle
- **State metadata dispatch** — Watch loop reads `meta.dispatchType` from actor snapshot instead of `deriveNextAction()` — single source of truth for what each state means
- **Snapshot persistence** — `getSnapshot()` → JSON → `createActor(machine, { snapshot })` round-trip, same `.manifest.json` format, zero migration
- **Consumer swap** — `post-dispatch.ts` reduced to thin event router, `watch-command.ts` reads dispatch from actor meta, `state-scanner.ts` uses actor for state resolution
- **Validate regression** — `VALIDATE_FAILED` as explicit implement ← validate transition with feature reset
- **Cancel from any state** — `CANCEL` event valid from any non-terminal state with `markCancelled` + `persist` actions
- **835 tests** — Comprehensive coverage across transitions, guards, actions, persistence round-trips, and integration flows

### v0.50.0 — Context Tree Compaction (Mar 2026)

- **Retro value-add gate** — Both retro walkers (context, meta) now check four criteria before creating L3 records: rationale, constraints, provenance, dissenting context. Redundant L3s that merely restate their parent L2 are silently skipped
- **Compaction agent** — New utility agent (`agents/compaction.md`) audits the full context tree with three ordered operations: staleness removal, L3 restatement folding, and L0 promotion detection for rules duplicated across 3+ phases
- **`beastmode compact` CLI** — On-demand context tree audit command, always runs regardless of release cadence
- **Release compaction integration** — Automatic compaction every 5 releases, runs before retro in checkpoint phase to prevent creating-then-immediately-deleting records

### v0.49.0 — Watch Output Noise (Mar 2026)

- **Centralized logger** — New `createLogger(verbosity, slug)` factory in `cli/src/logger.ts` with level-gated methods: `log()` (L0), `detail()` (L1), `debug()` (L2), `trace()` (L3), `warn()`/`error()` (stderr)
- **Verbosity flags** — `-v`/`-vv`/`-vvv` flag parsing on all CLI commands (watch, phase, cancel, status)
- **Full call-site migration** — All 70 `console.log`/`console.error` calls replaced with logger equivalents across 13 CLI files
- **Consistent output format** — `HH:MM:SS slug: message` across all commands
- **stderr/stdout split** — warn/error always write to stderr, info/debug to stdout
- **Fix** — Restored feature-isolation guards removed during call-site migration

### v0.48.0 — Slugless Design Entry (Mar 2026)

- **Slugless design entry** — `beastmode design` takes no arguments; generates random hex temp slug, asks "What are you trying to solve?" before any codebase exploration
- **Slug proposal gate** — Design checkpoint proposes a slug after decision tree completion, user confirms or overrides via gated decision
- **Post-dispatch rename** — CLI reads real slug from output.json and renames worktree dir, git branch, manifest file, manifest internals, and PRD artifact
- **Auto-suffix collision handling** — `-v2` through `-v99` when slug collides with existing worktree/branch
- **Graceful rename failure** — System continues under hex name if rename fails
- **Artifact rename fix** — Renamed artifacts from `slugless-design` to `design-assumptions-less-of-them-v2` for consistency

### v0.47.0 — iTerm2 Dispatch Strategy (Mar 2026)

- **iTerm2 dispatch strategy** — New `dispatch-strategy: iterm2` uses the `it2` CLI for native tab-per-epic and split-pane-per-phase pipeline visibility in iTerm2
- **It2Client wrapper** — Typed wrapper for `it2` CLI commands (create-tab, split-pane, close-pane, list-sessions) with full pane lifecycle management
- **ITermSessionFactory** — Implements `SessionFactory` interface for iTerm2 tab/pane creation, cleanup, and reconciliation
- **Auto-detection chain** — `dispatch-strategy: auto` now prioritizes iTerm2 (if detected + it2 available) before cmux and SDK
- **Environment detection** — Detects iTerm2 via `ITERM_SESSION_ID` and `TERM_PROGRAM` env vars
- **Startup reconciliation** — Reconciles existing `bm-*` tabs/panes from previous runs on watch startup
- **Badge notifications** — iTerm2 badge notifications for errors and blocked gates
- **GitHub sync fix** — Runtime discovery replaces manual config IDs

### v0.46.1 — Design Retro Always (Mar 2026)

- **Always-run design retro** — Design checkpoint now includes a `SKIP SECTION` directive that bypasses the Quick-Exit Check, ensuring every design session produces L2/L3 knowledge records regardless of session size

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
