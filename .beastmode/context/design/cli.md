# CLI Architecture

## Command Structure
- CLI name: `beastmode` with phase commands as direct arguments: `<phase> <slug>`, plus `dashboard` and `compact`
- `beastmode <phase> <slug>` executes a single phase in a CLI-owned worktree with streaming output — `run` subcommand is dropped. Phase detection matrix compares requested phase against manifest.phase: regression (requested < current) and same-phase rerun (requested == current with prior commits) reset the git branch to the predecessor phase's tag and regress the XState machine via REGRESS event; forward-jump (requested > current) is blocked with error. Manual CLI prompts for confirmation before destructive reset; watch loop skips prompt. CLI-managed git tags (`beastmode/<slug>/<phase>`) are created at phase checkpoint, deleted on regression, and renamed during slug rename
- `beastmode dashboard` runs fullscreen Ink v6 + React TUI with embedded watch loop — three-panel layout (EpicsPanel, OverviewPanel, LogPanel), iTerm2 terminal dispatch via ITermSessionFactory, lifecycle log entries for session visibility, context-sensitive key hints per view, keyboard navigation, alternate screen buffer mode, 1-second UI refresh tick; uses shared `status-data.ts` for data logic, WatchLoop EventEmitter typed events for state updates
- `beastmode cancel <slug>` performs full cleanup via shared cancel module: removes worktree and branch, deletes archive tags, phase tags, artifacts (excluding research), closes GitHub issue as not_planned, deletes manifest — ordered steps with warn-and-continue per step, idempotent; `--force` flag skips confirmation prompt for automated pipelines; confirmation defaults to No (only y/Y accepted)
- `beastmode compact` dispatches the compaction agent via existing session dispatch pattern — operates on the shared context tree without a worktree, always runs regardless of 5-release counter, produces stdout summary plus full artifact at `artifacts/compact/YYYY-MM-DD-compaction.md`
- Design phase exception: `beastmode design <topic>` spawns interactive Claude via `Bun.spawn` with inherited stdio — not the SDK

## Dispatch Abstraction
- ALWAYS use `SessionFactory` interface for phase dispatch — `create()`, optional `cleanup()`, `setBadgeOnContainer()`, `checkLiveness()` methods decouple dispatch mechanism from orchestration logic
- `ITermSessionFactory` is the sole implementation — creates iTerm2 terminal tabs via AppleScript, runs `beastmode <phase> <slug>` in each tab; detects completion via `fs.watch` on `artifacts/<phase>/` for `*.output.json`
- AbortController for cancellation — clean shutdown on Ctrl+C
- Design phase exception: `beastmode design <topic>` always spawns interactive Claude via `Bun.spawn` with inherited stdio — not dispatched through `SessionFactory`

## Worktree Lifecycle
- CLI owns full worktree lifecycle: create at first phase encounter, persist through all intermediate phases, squash-merge to main and remove at release
- Branch detection rewritten in TypeScript — `feature/<slug>` branch reuse or creation from origin/HEAD
- Shell hook (`hooks/worktree-create.sh`) deleted — functionality absorbed into CLI
- Justfile deleted entirely — CLI is the sole orchestration layer
- Error recovery: failed phases leave worktree dirty, next run picks up and overwrites

## Configuration
- ALWAYS reuse `.beastmode/config.yaml` with `cli:` section — no separate config file
- `cli.interval` controls poll interval (default 60 seconds)
- `hitl:` section added with per-phase prose fields (`design:`, `plan:`, `implement:`, `validate:`, `release:`) plus `model` (default: haiku) and `timeout` (default: 30s)
- No per-notification or per-cleanup config knobs — notifications fixed at errors+blocks, cleanup fixed at on-release
- Gates and other config sections are unchanged

## Recovery Model
- State files are the recovery point, not sessions — stateless session model
- On startup, scan for existing worktrees with uncommitted changes and re-dispatch from last committed state
- Lockfile (`cli/.beastmode-watch.lock`) prevents duplicate watch instances

## Manifest Lifecycle
- CLI creates manifest at first phase dispatch (design) via store.create(slug) before dispatching — manifest exists throughout the entire skill session
- ALWAYS enrich manifest from output.json after each dispatch — Stop hook auto-generates `artifacts/<phase>/YYYY-MM-DD-<slug>.output.json` from artifact frontmatter
- CLI is the sole manifest mutator via two modules: manifest-store.ts (get, list, save, create, validate, rename, find, slugify) and manifest.ts (enrich, advancePhase, regressPhase, markFeature, cancel, deriveNextAction, checkBlocked, shouldAdvance) — all pure functions return new manifests, caller calls store.save()
- Terminology: `slug` is an immutable 6-character hex assigned at worktree creation; `epic` is the human-readable name derived by the design skill after rename; `feature` is a sub-unit within an epic
- `store.rename()` atomically renames all slug-keyed resources (artifacts, branch, worktree, manifest file, manifest content) with prepare-then-execute strategy — collision resolution uses deterministic `<epic>-<hex>` suffix
- `resolveIdentifier()` resolves entities by exact ID -> exact slug -> prefix slug (opt-in via `allowPrefix: true`). Typed accessors `getEpic()` and `getFeature()` replace the removed `store.find()` for direct lookups
- `slugify()` and `isValidSlug()` centralize format validation in the store (`[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?`) — accepts dots and `--` epic-feature separator
- `originId` field preserves lineage from birth hex to final epic name after rename
- Cancel deletes the manifest file entirely via the shared cancel module (`cancelEpic()`) — cancelled features vanish from status/dashboard, git log serves as the historical record
- Manifest location: `.beastmode/state/YYYY-MM-DD-<slug>.manifest.json` — flat-file convention, local-only, gitignored
- ALWAYS rebuild manifest from worktree branch scanning on cold start — no persistent dependency on manifest file

## Pre-Dispatch Pipeline
- Before dispatch: early issue creation ensures GitHub issues exist so issue numbers are available from the first commit. Epic issues are created before design phase, feature issues before implement phase. Idempotent — skips if issue number already exists in manifest. Creates minimal stub (slug as title, phase badge, type label); body is enriched later at post-dispatch sync

## Post-Dispatch Pipeline
- After every phase dispatch: Stop hook generates output.json from artifact frontmatter, CLI reads output.json from `artifacts/<phase>/` by hex slug match, enriches manifest via manifest.ts pure functions, optionally calls `store.rename()` for design phase (memory-only), then single `store.save()`, then runs `syncGitHubForEpic()` which encapsulates loadConfig, discoverGitHub, syncGitHub, mutation write-back via setGitHubEpic()/setFeatureGitHubIssue(), and warn-and-continue error handling. After sync, a commit issue ref amend step appends `(#N)` to the most recent commit message — epic issue ref for phase checkpoints and release merges, feature issue ref for feature task commits (resolved from commit message prefix)
- Non-design phases fail fast if slug not found in store via `resolveIdentifier()` — design creates the slug, all other phases are read-only with respect to slug identity
- Machine persist action accumulates state in memory without disk writes — single `store.save()` at end of dispatch is the sole persist path
- Design abandon cleanup: two-layer defense detects when design session ends without producing output.json. Primary gate in phase.ts checks `loadWorktreePhaseOutput()` after `runInteractive()` returns — if missing, runs cleanup via the shared cancel module (`cancelEpic()` from `cancel-logic.ts` — handles worktree, branch, tags, artifacts, GitHub issue, manifest in order with warn-and-continue) before returning, preventing post-dispatch from being called. Secondary guard in post-dispatch.ts skips `DESIGN_COMPLETED` event when no design output exists — defensive backstop for edge cases (ReconcilingFactory path). Both non-zero exit (crash/Ctrl+C) and zero exit without output (graceful quit) trigger the same cleanup path. Cleanup is idempotent — shared cancel module succeeds with nothing left to clean on re-run
- `resolveDesignSlug()` (commit-message regex) deleted — output.json hex lookup replaces it
- `skipFinalPersist` flag deleted — single persist path needs no coordination
- `rename-slug.ts` deleted — logic absorbed into `store.rename()`
- github-sync.ts returns mutations instead of mutating manifests in-place — caller applies via manifest.ts + store.save()
- Same code path for manual `beastmode <phase>` and watch loop dispatch — no separate sync logic
- ALWAYS use post-only stateless sync — no pre-sync, no phase parameter, function reads manifest and makes GitHub match

## HITL Hook Dispatch
- CLI reads `hitl.<phase>` prose from `config.yaml`, templates it into a PreToolUse prompt hook config targeting `AskUserQuestion`, and writes to `.claude/settings.local.json` in the worktree before dispatching the session
- PostToolUse command hook for `AskUserQuestion` is written alongside the PreToolUse hook — logs auto/human decisions to `artifacts/<phase>/hitl-log.md`
- `cleanHitlSettings()` runs before `writeHitlSettings()` at each dispatch — prevents stale hooks from previous phases
- `settings.local.json` is gitignored — generated per-dispatch, no version control noise
- ALWAYS emit `bunx beastmode hooks <name> [phase]` as the hook command string — never absolute paths via `import.meta.dir`, never shell substitution (`$(git rev-parse)`), never environment variables; the CLI binary resolves at runtime via PATH, making hooks portable across machines, worktrees, and installation paths
- Manual `beastmode <phase>` dispatch goes through `phase.ts` for HITL settings injection. Dashboard dispatch goes through the pipeline runner which calls the same rebase + HITL sequence (rebase, cleanHitlSettings, getPhaseHitlProse, buildPreToolUseHook, writeHitlSettings) — uniform hook injection across both paths

## Phase Output Contract
- Skills write artifacts with YAML frontmatter to `artifacts/<phase>/` — skills never write output.json or manifests
- A Stop hook (generated into `.claude/settings.local.json` at dispatch time) fires when Claude finishes, scans `artifacts/<phase>/` for files matching the slug convention, reads YAML frontmatter, and generates `artifacts/<phase>/YYYY-MM-DD-<slug>.output.json`
- output.json is the sole completion signal for all dispatch strategies — replaces `.dispatch-done.json`
- Standardized artifact frontmatter across all phases: `phase`, `id` (entity identifier), `epic` (human name) always present; phase-specific additions: plan adds `feature`, `wave`; implement adds `feature`, `status`; validate adds `status`; release adds `bump`
- CLI reads output.json from the worktree's `artifacts/<phase>/` directory after dispatch, located by hex slug match for unambiguous identification
- `filenameMatchesEpic()` handles both hex-named files (pre-rename) and epic-named files (post-rename) during the design phase transition window

## Unified Hook Context
- ALWAYS use `buildEnvPrefix(context: EnvPrefixContext)` from `hitl-settings.ts` to produce the inline env var prefix for all command hooks — five vars with feature context (implement), three without
- Five canonical env vars: `BEASTMODE_PHASE`, `BEASTMODE_EPIC_ID`, `BEASTMODE_EPIC_SLUG`, `BEASTMODE_FEATURE_ID`, `BEASTMODE_FEATURE_SLUG` — feature vars omitted (not set) outside implement phase
- ALWAYS prepend structured metadata section in `assembleContext` output — delimited block containing phase, epic-id, epic-slug, feature-id, feature-slug, parent-artifacts, output-target; skills read metadata instead of parsing slash command args
- `computeOutputTarget` computes the full artifact path (date prefix + slug components + phase) — skills use the metadata output-target, never derive filenames
- HITL hooks read `BEASTMODE_PHASE` from env with positional arg fallback; session-start and session-stop require env vars (no fallback)
- Pipeline runner pre-creates store entity at Step 0 before worktree setup — entity ID available from first hook invocation; `reconcileDesign` create-if-missing fallback removed
- LLM prompt hooks (file-permission PreToolUse) are unchanged — env vars don't apply to prompt-type hooks

## Cancel Cleanup Module
- Shared module (`cancel-logic.ts`) consumed by three callers: CLI cancel command (`cancelCommand()`), dashboard cancel action, and design-abandon cleanup in phase.ts
- `cancelEpic()` takes an identifier string, resolves via `resolveIdentifier()` internally, extracts epic name from store for artifact matching
- Ordered cleanup steps with warn-and-continue per step:
  1. Remove worktree (`git worktree remove --force`) and delete `feature/<slug>` branch
  2. Delete archive tag `archive/<slug>` if present
  3. Delete all phase tags matching `beastmode/<slug>/*`
  4. Delete artifacts matching `-<epic>-` and `-<epic>.` patterns from `artifacts/{design,plan,implement,validate,release}/` — two patterns prevent false-positive prefix matches; research artifacts at `artifacts/research/` explicitly excluded
  5. Close GitHub issue as not_planned when `github.enabled` and manifest has epic number — gated on both conditions
  6. Delete manifest file (last step, after GitHub sync reads from it)
- Idempotent: when manifest is already gone (re-run), falls back to using the provided identifier directly for each cleanup step
- Confirmation prompt by default: prints summary of what will be deleted, accepts only y/Y; `--force` flag (extracted by `parseForce()` in args.ts) bypasses prompt
- Returns structured result: cleaned[] and warned[] arrays for caller inspection
- Design-abandon reuses `cancelEpic()` — at design phase most cleanup steps are no-ops (no tags, no artifacts beyond design, etc.)
- Dashboard cancel action aborts agent sessions via DispatchTracker before calling `cancelEpic()`
