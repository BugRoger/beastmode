---
phase: design
slug: cli-restructure
epic: cli-restructure
---

## Problem Statement

Feature branches drift from main across multi-phase workflows, and the CLI has two divergent dispatch paths (manual CLI and watch loop) that duplicate worktree setup, reconciliation, and teardown logic. The codebase uses competing file organization conventions (prefix-based, directory-based, and orphan files) with inconsistent naming, dead exports, and overlapping responsibilities.

## Solution

Add worktree rebase as a pipeline step, unify manual and watch loop dispatch into a single shared pipeline runner, restructure the CLI into domain directories with uniform naming, and remove dead code.

## User Stories

1. As an operator, I want feature branches to rebase onto main before each phase dispatch, so that merge distance doesn't accumulate across phases.
2. As a developer, I want a single pipeline runner that both manual CLI and watch loop call, so that dispatch behavior is identical regardless of entry point.
3. As a developer, I want CLI source files organized into domain directories with uniform verb naming, so that I can find code by its responsibility.
4. As a developer, I want dead exports and unused modules removed, so that the codebase reflects what's actually used.
5. As an operator, I want rebase failures to warn and proceed rather than block dispatch, so that stale-base scenarios don't halt the pipeline.

## Implementation Decisions

### Unified Pipeline

Both manual CLI (`commands/phase.ts`) and watch loop (`watch-command.ts`) call the same pipeline runner. Each becomes a thin wrapper that selects the dispatch strategy (interactive, SDK, cmux, iTerm2) and calls `pipeline/runner.ts`.

Pipeline steps in order:

| Step | Domain Call | Notes |
|------|-----------|-------|
| 1 | `git.worktree.prepare` | Create/enter worktree |
| 2 | `git.worktree.rebase` | Rebase onto local main (skip for design) |
| 3 | `settings.create` | Write .claude/settings.local.json with hooks |
| 4 | `dispatch.run` | Run session (interactive or SDK or cmux or it2) |
| 5 | `artifacts.collect` | Read phase output.json |
| 6 | `manifest.reconcile` | Update manifest from phase results |
| 7 | `manifest.advance` | Advance phase, enrich metadata |
| 8 | `github.mirror` | One-way sync to GitHub |
| 9 | `git.worktree.cleanup` | Release only: archive + remove |

### Rebase Behavior

- Phases: all except design (design creates a fresh worktree from origin/HEAD)
- Target: local main branch (no network dependency)
- On conflict: abort rebase, log warning, proceed on stale base
- Logging: minimal — one line per outcome (success/skip/conflict)

### Domain Directory Structure

Seven domain directories. Each file uses uniform CRUD verbs from a fixed vocabulary: `create`, `get`, `list`, `find`, `update`, `delete`, `run`, `parse`, `format`. Domain-specific verbs (`rebase`, `merge`, `rename`) allowed where no generic verb fits.

```
git/
├── worktree.ts         create · get · delete · rebase · merge
└── tags.ts             create · delete · rename

hooks/
├── pre-tool-use.ts     build · get
└── post-tool-use.ts    format

dispatch/
├── factory.ts          create · run
├── tracker.ts          DispatchTracker
├── cmux.ts             CmuxClient · CmuxSessionFactory
├── it2.ts              It2Client · ITermSessionFactory
└── types.ts            (types only)

artifacts/
└── reader.ts           get · find · parse · split

manifest/
├── store.ts            create · get · list · find · update · delete · rename
├── pure.ts             enrich · regress · derive
└── reconcile.ts        run

github/
├── sync.ts             run · format
├── discovery.ts        run
└── cli.ts              create · get · list · update · delete

pipeline/
├── runner.ts           run
└── startup.ts          run

pipeline-machine/       unchanged
commands/               unchanged (thin wrappers)
dashboard/              unchanged

shared/
├── status-data.ts
├── log-format.ts
└── cancel-logic.ts

settings.ts             create · delete
config.ts               loadConfig · findProjectRoot
args.ts
index.ts
lockfile.ts
logger.ts
types.ts
generate-output.ts      standalone Stop hook entry point
```

### File Collapse Map

| Target | Absorbs |
|--------|---------|
| `git/worktree.ts` | `git.ts` |
| `dispatch/factory.ts` | `session.ts`, `runners/interactive-runner.ts`, `sdk-streaming.ts` |
| `dispatch/cmux.ts` | `cmux-client.ts`, `cmux-session.ts`, `cmux-types.ts` |
| `dispatch/it2.ts` | `it2-client.ts`, `it2-session.ts` |
| `dispatch/types.ts` | `watch-types.ts` |
| `artifacts/reader.ts` | `phase-output.ts`, `artifact-reader.ts`, `section-extractor.ts`, `section-splitter.ts` |
| `manifest/reconcile.ts` | `reconcile.ts` (moved from pipeline/) |
| `manifest/pure.ts` | `hydrate-actor.ts` |
| `github/sync.ts` | `body-format.ts` |
| `shared/status-data.ts` | `change-detect.ts` |
| `config.ts` | `project-root.ts` |
| `pipeline/runner.ts` | `post-dispatch.ts`, `ReconcilingFactory` + `dispatchPhase` + `selectStrategy` from `watch-command.ts` |

### Dead Code Removal

Entire module deleted:

- `phase-detection.ts` — replaced by XState pipeline machine, zero production consumers

Dead exports removed (zero consumers including tests):

- `executeRegression`, `findPredecessorTag`, `hasPhaseTag`, `predecessorOf`, `formatRegressionWarning` (all from phase-detection.ts)
- `extractArtifactPaths`, `extractFeatureStatuses`, `filenameMatchesFeature` (phase-output.ts)
- `formatReleaseComment` (body-format.ts)
- `statusWatchLoop`, `isWatchRunning` (commands/status.ts)
- `CmuxProtocolError`, `CmuxTimeoutError` (cmux-client.ts)

Dead module deleted:

- `sdk-message-mapper.ts` + `sdk-message-types.ts` — `mapMessage()` has zero production consumers

Test-only exports: remove `export` keyword, refactor tests to use public API or module internals.

### Naming Conventions

- Directories: noun (the domain)
- Files: noun (the entity or concept)
- Functions: verb or verbNoun from the fixed vocabulary
- No prefix stutter (`github/sync.ts` not `github/github-sync.ts`)
- No domain-in-filename (`manifest/pure.ts` not `manifest/manifest.ts`)
- Proper nouns keep prefix (`cmux-*`, `it2-*` stay inside their directory)

## Testing Decisions

- Existing tests move with their source files (same directory rename)
- Tests for deleted dead code are deleted
- New tests for `git/worktree.rebase()`: success path, conflict-abort path, design-skip path
- New tests for `pipeline/runner.ts`: verify all 8 steps execute in order, verify design skips rebase, verify release runs cleanup
- Integration test: manual CLI and watch loop produce identical pipeline step sequences

## Out of Scope

- Refactoring `pipeline-machine/` (XState machines)
- Refactoring `dashboard/` (Ink/React TUI)
- Refactoring `commands/` internal logic (they become thinner but stay as files)
- Network-based rebase (fetching origin/main before rebase)
- Configurable rebase target

## Further Notes

File count: 58 → 44 (14 fewer files). Same functionality, fewer seams, uniform naming.

## Deferred Ideas

- Formal PipelineStep interface with execute() for step composition (currently plain function calls — simpler)
- Full dispatch path unification including dashboard's embedded watch loop
- Configurable rebase target (origin/main vs local main) via config.yaml
