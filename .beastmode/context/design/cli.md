# CLI Architecture

## Command Structure
- CLI name: `beastmode` with phase commands as direct arguments: `<phase> <slug>`, plus `watch`, `status`, and `compact`
- `beastmode <phase> <slug>` executes a single phase in a CLI-owned worktree with streaming output — `run` subcommand is dropped
- `beastmode watch` runs the autonomous pipeline loop as a foreground process
- `beastmode status` shows compact table (Epic | Phase | Features | Status) without running Claude — `--verbose` flag shows skipped/malformed manifests and validation errors; `--watch`/`-w` flag enables live dashboard mode with 2-second polling, full-screen ANSI redraw, one-cycle change highlighting, blocked gate details, and watch loop running indicator via lockfile detection — no --verbose in watch mode, Ctrl+C for clean exit, no new dependencies
- `beastmode compact` dispatches the compaction agent via existing session dispatch pattern — operates on the shared context tree without a worktree, always runs regardless of 5-release counter, produces stdout summary plus full artifact at `artifacts/compact/YYYY-MM-DD-compaction.md`
- Design phase exception: `beastmode design <topic>` spawns interactive Claude via `Bun.spawn` with inherited stdio — not the SDK

## Dispatch Abstraction
- ALWAYS use `SessionStrategy` interface for phase dispatch — `dispatch()`, `isComplete()`, `cleanup()` methods decouple dispatch mechanism from orchestration logic
- `SdkStrategy`: uses `@anthropic-ai/claude-agent-sdk` with `query()` invocation, `settingSources: ['project']`, `permissionMode: 'bypassPermissions'` — typed session management, streaming, cost tracking; reads output.json after query() iterator completes
- `CmuxStrategy`: creates cmux terminal surface via `cmux` CLI with `--json` flag, sends `beastmode <phase> <slug>` via `cmux send-surface` — CLI-in-surface execution, agents get full interactive terminal capability; detects completion via `fs.watch` on `artifacts/<phase>/` for `*.output.json`
- `SessionFactory` reads `cli.dispatch-strategy` config (sdk | cmux | auto) + runtime state (cmux availability) to return the right strategy
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
- `cli.dispatch-strategy` controls dispatch mechanism (sdk | cmux | auto) — `auto` uses cmux if available, falls back to SDK
- No per-notification or per-cleanup config knobs — notifications fixed at errors+blocks, cleanup fixed at on-release
- Gates and other config sections are unchanged

## Cost Tracking
- Per-dispatch run log appended to `.beastmode-runs.json` — epic, phase, feature, cost_usd, duration_ms, exit_status, timestamp
- Cost reporting removed from `beastmode status` — status shows pipeline state only, cost data remains in run log for external consumption

## Recovery Model
- State files are the recovery point, not sessions — stateless session model
- On startup, scan for existing worktrees with uncommitted changes and re-dispatch from last committed state
- Lockfile (`cli/.beastmode-watch.lock`) prevents duplicate watch instances

## Manifest Lifecycle
- CLI creates manifest at first phase dispatch (design) via store.create(slug) before dispatching — manifest exists throughout the entire skill session
- ALWAYS enrich manifest from output.json after each dispatch — Stop hook auto-generates `artifacts/<phase>/YYYY-MM-DD-<slug>.output.json` from artifact frontmatter
- CLI is the sole manifest mutator via two modules: manifest-store.ts (get, list, save, create, validate) and manifest.ts (enrich, advancePhase, regressPhase, markFeature, cancel, deriveNextAction, checkBlocked, shouldAdvance) — all pure functions return new manifests, caller calls store.save()
- Manifest location: `.beastmode/state/YYYY-MM-DD-<slug>.manifest.json` — flat-file convention, local-only, gitignored
- ALWAYS rebuild manifest from worktree branch scanning on cold start — no persistent dependency on manifest file

## Post-Dispatch Pipeline
- After every phase dispatch: Stop hook generates output.json from artifact frontmatter, CLI reads output.json from `artifacts/<phase>/`, enriches manifest via manifest.ts pure functions, runs `syncGitHub(manifest, config)`
- github-sync.ts returns mutations instead of mutating manifests in-place — caller applies via manifest.ts + store.save()
- Same code path for manual `beastmode <phase>` and watch loop dispatch — no separate sync logic
- ALWAYS use post-only stateless sync — no pre-sync, no phase parameter, function reads manifest and makes GitHub match

## Phase Output Contract
- Skills write artifacts with YAML frontmatter to `artifacts/<phase>/` — skills never write output.json or manifests
- A Stop hook (configured in `.claude/settings.json`) fires when Claude finishes, scans `artifacts/<phase>/` for files matching the slug convention, reads YAML frontmatter, and generates `artifacts/<phase>/YYYY-MM-DD-<slug>.output.json`
- output.json is the sole completion signal for all dispatch strategies — replaces `.dispatch-done.json`
- Artifact frontmatter schema per phase: design (phase, slug), plan (phase, epic, feature), implement (phase, epic, feature, status), validate (phase, slug, status), release (phase, slug, bump)
- CLI reads output.json from the worktree's `artifacts/<phase>/` directory after dispatch
